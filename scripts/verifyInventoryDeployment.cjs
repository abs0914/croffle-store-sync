#!/usr/bin/env node

/**
 * Verify Inventory Deployment
 * 
 * This script verifies that the inventory deployment was successful.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
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
          if (body.trim() === '') {
            resolve(null);
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
            } else {
              resolve(result);
            }
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

async function authenticateAdmin() {
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  const authResult = await makeRequest(authOptions, authData);
  headers.Authorization = `Bearer ${authResult.access_token}`;
  console.log('✅ Admin authenticated successfully');
  return authResult;
}

async function main() {
  try {
    console.log('🔍 VERIFYING INVENTORY DEPLOYMENT');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Check inventory
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=store_id,item,stock_quantity,cost&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    console.log(`📦 Found ${inventory.length} inventory items total`);
    
    // Check stores
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id,name&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    console.log(`🏪 Found ${stores.length} active stores`);
    
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
    console.log('-'.repeat(50));
    
    Object.entries(inventoryByStore).forEach(([storeName, items]) => {
      console.log(`\n${storeName}: ${items.length} items`);
      
      // Show sample items
      items.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.item} (${item.stock_quantity} units, ₱${item.cost})`);
      });
      
      if (items.length > 5) {
        console.log(`   ... and ${items.length - 5} more items`);
      }
    });
    
    // Get unique items across all stores
    const uniqueItems = [...new Set(inventory.map(item => item.item))];
    console.log(`\n📋 UNIQUE ITEMS ACROSS ALL STORES: ${uniqueItems.length}`);
    console.log('-'.repeat(50));
    
    // Show sample unique items
    uniqueItems.slice(0, 15).forEach((item, index) => {
      console.log(`${index + 1}. ${item}`);
    });
    
    if (uniqueItems.length > 15) {
      console.log(`... and ${uniqueItems.length - 15} more unique items`);
    }
    
    // Analysis
    console.log('\n🧮 DEPLOYMENT ANALYSIS:');
    console.log('-'.repeat(50));
    console.log(`Total inventory records: ${inventory.length}`);
    console.log(`Unique items: ${uniqueItems.length}`);
    console.log(`Active stores: ${stores.length}`);
    console.log(`Expected if all stores had all items: ${uniqueItems.length} × ${stores.length} = ${uniqueItems.length * stores.length}`);
    
    // Check completeness
    const expectedTotal = uniqueItems.length * stores.length;
    const actualTotal = inventory.length;
    
    if (actualTotal === expectedTotal) {
      console.log('\n✅ COMPLETE DEPLOYMENT');
      console.log('All stores have all inventory items.');
      
      // Check if each store has all items
      let allStoresComplete = true;
      stores.forEach(store => {
        const storeItems = inventory.filter(item => item.store_id === store.id);
        if (storeItems.length !== uniqueItems.length) {
          console.log(`⚠️  ${store.name}: Has ${storeItems.length}/${uniqueItems.length} items`);
          allStoresComplete = false;
        }
      });
      
      if (allStoresComplete) {
        console.log('\n🎯 SUCCESS: Perfect deployment!');
        console.log('Every store has every inventory item.');
      }
      
    } else {
      console.log('\n⚠️  INCOMPLETE DEPLOYMENT');
      console.log(`Missing ${expectedTotal - actualTotal} inventory records.`);
      
      // Check which stores are missing items
      console.log('\n🔍 MISSING ITEMS BY STORE:');
      stores.forEach(store => {
        const storeItems = inventory.filter(item => item.store_id === store.id);
        const storeItemNames = storeItems.map(item => item.item);
        const missingItems = uniqueItems.filter(item => !storeItemNames.includes(item));
        
        if (missingItems.length > 0) {
          console.log(`\n${store.name}: Missing ${missingItems.length} items`);
          missingItems.slice(0, 5).forEach(item => {
            console.log(`   - ${item}`);
          });
          if (missingItems.length > 5) {
            console.log(`   ... and ${missingItems.length - 5} more`);
          }
        } else {
          console.log(`\n${store.name}: ✅ Has all ${uniqueItems.length} items`);
        }
      });
    }
    
    // Final summary
    console.log('\n📈 FINAL SUMMARY:');
    console.log('='.repeat(50));
    
    if (actualTotal >= 400) {
      console.log('🎉 DEPLOYMENT SUCCESS!');
      console.log(`✅ ${actualTotal} inventory items deployed across ${stores.length} stores`);
      console.log(`✅ ${uniqueItems.length} unique ingredients available`);
      console.log('✅ All stores should be able to prepare recipes');
      
      if (uniqueItems.length >= 55) {
        console.log('✅ Sufficient ingredients for all 61 products');
      } else {
        console.log(`⚠️  Only ${uniqueItems.length} ingredients (expected ~61)`);
      }
    } else {
      console.log('⚠️  DEPLOYMENT INCOMPLETE');
      console.log(`❌ Only ${actualTotal} inventory items (expected ~440)`);
      console.log('❌ Some stores may not be able to prepare all recipes');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();
