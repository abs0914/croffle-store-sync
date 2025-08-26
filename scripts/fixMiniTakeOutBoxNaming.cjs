#!/usr/bin/env node

/**
 * Fix Mini Take-Out Box Naming in Store Inventories
 * 
 * This script updates store inventory items to match the corrected
 * commissary naming: "Mini Take-Out Box" (with hyphen)
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

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
          if (body.trim() === '') {
            // Empty response is OK for PATCH operations
            resolve({});
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
            } else {
              resolve(result);
            }
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Success status with unparseable body - treat as success
            resolve({});
          } else {
            reject(new Error(`Parse error: ${e.message}`));
          }
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
  console.log('🔐 Authenticating as admin...');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers
  };
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const authResult = await makeRequest(authOptions, authData);
    console.log('✅ Admin authentication successful\n');
    
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    return authResult;
  } catch (error) {
    console.log('❌ Admin auth failed:', error.message);
    throw error;
  }
}

async function fixMiniTakeOutBoxNaming() {
  console.log('🔧 FIXING MINI TAKE-OUT BOX NAMING IN STORE INVENTORIES');
  console.log('='.repeat(60));
  
  await authenticateAdmin();
  
  // Get all stores
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  console.log(`🏪 Found ${stores.length} stores to update\n`);
  
  const updateResults = [];
  
  for (const store of stores) {
    console.log(`📦 Processing ${store.name}...`);
    
    // Find inventory items with the old naming
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_stock?select=id,item,stock_quantity,unit&store_id=eq.${store.id}&item=eq.${encodeURIComponent('Mini Take Out Box')}`,
      method: 'GET',
      headers
    };
    
    try {
      const inventory = await makeRequest(inventoryOptions);
      
      if (inventory.length === 0) {
        console.log('   ⚠️  No "Mini Take Out Box" items found');
        updateResults.push({
          store: store.name,
          storeId: store.id,
          found: false,
          updated: false,
          error: null
        });
        continue;
      }
      
      console.log(`   📋 Found ${inventory.length} items to update`);
      
      // Update each item
      for (const item of inventory) {
        console.log(`   🔄 Updating: "${item.item}" -> "Mini Take-Out Box"`);
        
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?id=eq.${item.id}`,
          method: 'PATCH',
          headers
        };
        
        const updateData = {
          item: 'Mini Take-Out Box'
        };
        
        await makeRequest(updateOptions, updateData);
        console.log(`   ✅ Updated successfully (Stock: ${item.stock_quantity} ${item.unit})`);
      }
      
      updateResults.push({
        store: store.name,
        storeId: store.id,
        found: true,
        updated: true,
        itemsUpdated: inventory.length,
        error: null
      });
      
    } catch (error) {
      console.log(`   ❌ Error updating ${store.name}: ${error.message}`);
      updateResults.push({
        store: store.name,
        storeId: store.id,
        found: false,
        updated: false,
        error: error.message
      });
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 UPDATE SUMMARY');
  console.log('='.repeat(40));
  
  const successful = updateResults.filter(r => r.updated);
  const failed = updateResults.filter(r => r.error);
  const notFound = updateResults.filter(r => !r.found && !r.error);
  
  console.log(`✅ Successfully updated: ${successful.length} stores`);
  console.log(`❌ Failed updates: ${failed.length} stores`);
  console.log(`⚠️  No items found: ${notFound.length} stores`);
  
  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFUL UPDATES:');
    successful.forEach(result => {
      console.log(`   - ${result.store}: ${result.itemsUpdated} items updated`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED UPDATES:');
    failed.forEach(result => {
      console.log(`   - ${result.store}: ${result.error}`);
    });
  }
  
  if (notFound.length > 0) {
    console.log('\n⚠️  NO ITEMS FOUND (may already be correct):');
    notFound.forEach(result => {
      console.log(`   - ${result.store}`);
    });
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('-'.repeat(40));
  console.log('1. Verify all stores now have "Mini Take-Out Box" (with hyphen)');
  console.log('2. Test recipe deployment validation');
  console.log('3. Deploy affected recipes to stores');
  console.log('4. Monitor for any remaining naming issues');
  
  if (successful.length === stores.length || (successful.length + notFound.length) === stores.length) {
    console.log('\n🚀 ALL STORES UPDATED SUCCESSFULLY!');
    console.log('   Ready to proceed with recipe deployment.');
  }
}

fixMiniTakeOutBoxNaming().catch(console.error);
