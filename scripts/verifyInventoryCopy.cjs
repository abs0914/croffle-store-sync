#!/usr/bin/env node

/**
 * Verify Inventory Copy Results
 * 
 * This script verifies that inventory was successfully copied from Sugbo Mercado
 * to the target stores and provides a detailed comparison.
 * 
 * Usage: node scripts/verifyInventoryCopy.cjs
 */

const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// Store names to verify
const SOURCE_STORE_NAME = 'Sugbo Mercado (IT Park, Cebu)';
const TARGET_STORES = [
  'SM City Cebu',
  'SM Savemore Tacloban'
];

let authToken = null;

// Headers for API requests
const getHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  ...(authToken && { 'Authorization': `Bearer ${authToken}` })
});

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

// Authenticate as admin
async function authenticateAdmin() {
  console.log('🔐 Authenticating as admin...');
  
  const authOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };

  const authData = {
    email: 'admin@example.com',
    password: 'password123'
  };

  try {
    const response = await makeRequest(authOptions, authData);
    authToken = response.access_token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Find store by name
async function findStoreByName(storeName) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/stores?select=*&name=eq.${encodeURIComponent(storeName)}`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const stores = await makeRequest(options);
    return stores.length > 0 ? stores[0] : null;
  } catch (error) {
    console.error(`Error finding store "${storeName}":`, error.message);
    return null;
  }
}

// Get inventory from store
async function getStoreInventory(storeId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${storeId}&is_active=eq.true&order=item`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const inventory = await makeRequest(options);
    return inventory || [];
  } catch (error) {
    console.error('Error fetching store inventory:', error.message);
    return [];
  }
}

// Compare inventories
function compareInventories(sourceInventory, targetInventory, targetStoreName) {
  console.log(`\n📊 Comparing inventory for ${targetStoreName}:`);
  
  const sourceItems = new Map(sourceInventory.map(item => [item.item, item]));
  const targetItems = new Map(targetInventory.map(item => [item.item, item]));
  
  const matched = [];
  const missing = [];
  const extra = [];
  
  // Check for matched and missing items
  for (const [itemName, sourceItem] of sourceItems) {
    if (targetItems.has(itemName)) {
      const targetItem = targetItems.get(itemName);
      matched.push({
        name: itemName,
        sourceQuantity: sourceItem.stock_quantity,
        targetQuantity: targetItem.stock_quantity,
        unit: sourceItem.unit,
        cost: sourceItem.cost
      });
    } else {
      missing.push({
        name: itemName,
        quantity: sourceItem.stock_quantity,
        unit: sourceItem.unit,
        cost: sourceItem.cost
      });
    }
  }
  
  // Check for extra items in target
  for (const [itemName, targetItem] of targetItems) {
    if (!sourceItems.has(itemName)) {
      extra.push({
        name: itemName,
        quantity: targetItem.stock_quantity,
        unit: targetItem.unit,
        cost: targetItem.cost
      });
    }
  }
  
  console.log(`   ✅ Matched items: ${matched.length}`);
  console.log(`   ❌ Missing items: ${missing.length}`);
  console.log(`   ➕ Extra items: ${extra.length}`);
  
  if (missing.length > 0) {
    console.log('\n   Missing items:');
    missing.slice(0, 10).forEach(item => {
      console.log(`     - ${item.name}: ${item.quantity} ${item.unit}`);
    });
    if (missing.length > 10) {
      console.log(`     ... and ${missing.length - 10} more`);
    }
  }
  
  if (extra.length > 0) {
    console.log('\n   Extra items (not in source):');
    extra.slice(0, 5).forEach(item => {
      console.log(`     + ${item.name}: ${item.quantity} ${item.unit}`);
    });
    if (extra.length > 5) {
      console.log(`     ... and ${extra.length - 5} more`);
    }
  }
  
  return {
    matched: matched.length,
    missing: missing.length,
    extra: extra.length,
    total: targetInventory.length,
    missingItems: missing,
    extraItems: extra
  };
}

// Main verification function
async function main() {
  console.log('🔍 Starting inventory verification...\n');
  
  // Step 1: Authenticate
  const authenticated = await authenticateAdmin();
  if (!authenticated) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Step 2: Find source store
  console.log(`\n🔍 Finding source store: ${SOURCE_STORE_NAME}`);
  const sourceStore = await findStoreByName(SOURCE_STORE_NAME);
  
  if (!sourceStore) {
    console.log(`❌ Source store "${SOURCE_STORE_NAME}" not found`);
    return;
  }
  
  console.log(`✅ Found source store: ${sourceStore.name} (ID: ${sourceStore.id})`);
  
  // Step 3: Get source inventory
  console.log('\n📋 Fetching source inventory...');
  const sourceInventory = await getStoreInventory(sourceStore.id);
  
  if (sourceInventory.length === 0) {
    console.log('❌ No inventory items found in source store');
    return;
  }
  
  console.log(`✅ Found ${sourceInventory.length} inventory items in source store`);
  
  // Step 4: Verify each target store
  const verificationResults = [];
  
  for (const targetStoreName of TARGET_STORES) {
    console.log(`\n🏪 Verifying target store: ${targetStoreName}`);
    
    const targetStore = await findStoreByName(targetStoreName);
    
    if (!targetStore) {
      console.log(`   ❌ Target store "${targetStoreName}" not found`);
      verificationResults.push({
        store: targetStoreName,
        success: false,
        error: 'Store not found'
      });
      continue;
    }
    
    console.log(`   ✅ Found store: ${targetStore.name} (ID: ${targetStore.id})`);
    
    const targetInventory = await getStoreInventory(targetStore.id);
    console.log(`   📦 Target inventory items: ${targetInventory.length}`);
    
    const comparison = compareInventories(sourceInventory, targetInventory, targetStoreName);
    
    verificationResults.push({
      store: targetStoreName,
      storeId: targetStore.id,
      success: true,
      ...comparison
    });
  }
  
  // Step 5: Summary
  console.log('\n📊 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Source Store: ${sourceStore.name}`);
  console.log(`Source Inventory Items: ${sourceInventory.length}`);
  console.log('');
  
  verificationResults.forEach(result => {
    if (result.success) {
      const completeness = result.missing === 0 ? '✅' : '⚠️';
      console.log(`${completeness} ${result.store}:`);
      console.log(`   - Total items: ${result.total}`);
      console.log(`   - Matched: ${result.matched}`);
      console.log(`   - Missing: ${result.missing}`);
      console.log(`   - Extra: ${result.extra}`);
      
      const percentage = result.matched > 0 ? ((result.matched / sourceInventory.length) * 100).toFixed(1) : '0.0';
      console.log(`   - Completeness: ${percentage}%`);
    } else {
      console.log(`❌ ${result.store}: ${result.error}`);
    }
  });
  
  const successfulStores = verificationResults.filter(r => r.success).length;
  const completeStores = verificationResults.filter(r => r.success && r.missing === 0).length;
  
  console.log('');
  console.log(`📈 Stores verified: ${successfulStores}/${TARGET_STORES.length}`);
  console.log(`✅ Complete copies: ${completeStores}/${TARGET_STORES.length}`);
  
  if (completeStores === TARGET_STORES.length) {
    console.log('\n🎉 All inventory copies are complete and verified!');
  } else if (successfulStores === TARGET_STORES.length) {
    console.log('\n⚠️  Some stores have incomplete inventory copies. Check the details above.');
  } else {
    console.log('\n❌ Some stores could not be verified. Check the errors above.');
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Verification failed:', error.message);
  process.exit(1);
});
