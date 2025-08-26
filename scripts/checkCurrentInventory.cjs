#!/usr/bin/env node

/**
 * Check Current Inventory
 * 
 * This script checks what inventory items are currently deployed
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function main() {
  try {
    console.log('📦 CHECKING CURRENT INVENTORY DEPLOYMENT');
    console.log('='.repeat(50));
    
    // Check current inventory without joins to avoid permission issues
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=store_id,item,unit,stock_quantity,cost&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    console.log(`✅ Found ${inventory.length} inventory items total`);
    
    // Get stores
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id,name&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    console.log(`✅ Found ${stores.length} active stores`);
    
    // Create store lookup
    const storeMap = {};
    stores.forEach(store => {
      storeMap[store.id] = store.name;
    });
    
    // Group inventory by store
    const inventoryByStore = {};
    inventory.forEach(item => {
      const storeName = storeMap[item.store_id] || `Unknown Store (${item.store_id})`;
      if (!inventoryByStore[storeName]) {
        inventoryByStore[storeName] = [];
      }
      inventoryByStore[storeName].push(item);
    });
    
    console.log('\n📊 INVENTORY BY STORE:');
    console.log('-'.repeat(40));
    
    Object.entries(inventoryByStore).forEach(([storeName, items]) => {
      console.log(`\n${storeName}: ${items.length} items`);
      items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.item} (${item.stock_quantity} ${item.unit})`);
      });
    });
    
    // Get unique items across all stores
    const uniqueItems = [...new Set(inventory.map(item => item.item))];
    console.log(`\n📋 UNIQUE ITEMS ACROSS ALL STORES: ${uniqueItems.length}`);
    console.log('-'.repeat(40));
    uniqueItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item}`);
    });
    
    // Analysis
    console.log('\n🧮 ANALYSIS:');
    console.log('-'.repeat(40));
    console.log(`Total inventory records: ${inventory.length}`);
    console.log(`Unique items: ${uniqueItems.length}`);
    console.log(`Active stores: ${stores.length}`);
    console.log(`Expected if all stores had all items: ${uniqueItems.length} × ${stores.length} = ${uniqueItems.length * stores.length}`);
    
    if (inventory.length < uniqueItems.length * stores.length) {
      console.log('\n❌ INCOMPLETE DEPLOYMENT DETECTED');
      console.log('Some stores are missing some inventory items.');
      
      // Check which stores are missing items
      console.log('\n🔍 MISSING ITEMS BY STORE:');
      stores.forEach(store => {
        const storeItems = inventory.filter(item => item.store_id === store.id);
        const storeItemNames = storeItems.map(item => item.item);
        const missingItems = uniqueItems.filter(item => !storeItemNames.includes(item));
        
        if (missingItems.length > 0) {
          console.log(`\n${store.name}: Missing ${missingItems.length} items`);
          missingItems.forEach(item => {
            console.log(`   - ${item}`);
          });
        } else {
          console.log(`\n${store.name}: ✅ Has all ${uniqueItems.length} items`);
        }
      });
    } else {
      console.log('\n✅ COMPLETE DEPLOYMENT');
      console.log('All stores have all inventory items.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
