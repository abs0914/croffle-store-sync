#!/usr/bin/env node

/**
 * Copy Inventory Data from Sugbo Mercado to New Stores
 * 
 * This script copies all inventory data from "Sugbo Mercado (IT Park, Cebu)" 
 * to two new stores: "SM City Cebu" and "SM Savemore Tacloban"
 * 
 * Usage: node scripts/copyInventoryToNewStores.cjs
 */

const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// Store names to create/find
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

// Create a new store
async function createStore(storeName) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores',
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Prefer': 'return=representation'
    }
  };

  const storeData = {
    name: storeName,
    is_active: true,
    address: '',
    phone: '',
    email: ''
  };

  try {
    const result = await makeRequest(options, storeData);
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error(`Error creating store "${storeName}":`, error.message);
    return null;
  }
}

// Get inventory from source store
async function getSourceInventory(storeId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${storeId}&is_active=eq.true`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const inventory = await makeRequest(options);
    return inventory || [];
  } catch (error) {
    console.error('Error fetching source inventory:', error.message);
    return [];
  }
}

// Check if inventory item already exists in target store
async function checkExistingInventory(storeId, itemName) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=id&store_id=eq.${storeId}&item=eq.${encodeURIComponent(itemName)}`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const existing = await makeRequest(options);
    return existing.length > 0;
  } catch (error) {
    console.error(`Error checking existing inventory for "${itemName}":`, error.message);
    return false;
  }
}

// Copy inventory items to target store
async function copyInventoryToStore(sourceInventory, targetStoreId, targetStoreName) {
  console.log(`\n📦 Copying inventory to ${targetStoreName}...`);
  
  const itemsToCopy = [];
  let skippedCount = 0;
  
  // Check for existing items first
  for (const item of sourceInventory) {
    const exists = await checkExistingInventory(targetStoreId, item.item);
    if (exists) {
      console.log(`   ⚠️  Skipping "${item.item}" - already exists`);
      skippedCount++;
    } else {
      // Prepare item for copying (exclude id, store_id, created_at, updated_at)
      const newItem = {
        store_id: targetStoreId,
        item: item.item,
        unit: item.unit,
        stock_quantity: item.stock_quantity || 0,
        minimum_threshold: item.minimum_threshold || 0,
        cost: item.cost || null,
        sku: item.sku || null,
        is_active: true
      };
      
      // Add optional fields if they exist
      if (item.serving_ready_quantity !== undefined) {
        newItem.serving_ready_quantity = item.serving_ready_quantity;
      }
      if (item.is_fractional_supported !== undefined) {
        newItem.is_fractional_supported = item.is_fractional_supported;
      }
      if (item.unit_type !== undefined) {
        newItem.unit_type = item.unit_type;
      }
      
      itemsToCopy.push(newItem);
    }
  }
  
  if (itemsToCopy.length === 0) {
    console.log(`   ℹ️  No new items to copy (${skippedCount} items already exist)`);
    return { success: true, copied: 0, skipped: skippedCount };
  }
  
  // Batch insert inventory items
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/inventory_stock',
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Prefer': 'return=representation'
    }
  };

  try {
    const result = await makeRequest(options, itemsToCopy);
    const copiedCount = Array.isArray(result) ? result.length : 1;
    console.log(`   ✅ Successfully copied ${copiedCount} inventory items`);
    console.log(`   ℹ️  Skipped ${skippedCount} existing items`);
    
    return { success: true, copied: copiedCount, skipped: skippedCount };
  } catch (error) {
    console.error(`   ❌ Error copying inventory:`, error.message);
    return { success: false, copied: 0, skipped: skippedCount };
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting inventory copy process...\n');
  
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
  const sourceInventory = await getSourceInventory(sourceStore.id);
  
  if (sourceInventory.length === 0) {
    console.log('❌ No inventory items found in source store');
    return;
  }
  
  console.log(`✅ Found ${sourceInventory.length} inventory items in source store`);
  console.log('\n📋 Sample inventory items:');
  sourceInventory.slice(0, 5).forEach(item => {
    console.log(`   - ${item.item}: ${item.stock_quantity} ${item.unit} (Cost: ₱${item.cost || 'N/A'})`);
  });
  
  // Step 4: Process target stores
  const results = [];
  
  for (const targetStoreName of TARGET_STORES) {
    console.log(`\n🏪 Processing target store: ${targetStoreName}`);
    
    // Find or create target store
    let targetStore = await findStoreByName(targetStoreName);
    
    if (!targetStore) {
      console.log(`   📝 Creating new store: ${targetStoreName}`);
      targetStore = await createStore(targetStoreName);
      
      if (!targetStore) {
        console.log(`   ❌ Failed to create store: ${targetStoreName}`);
        results.push({ store: targetStoreName, success: false, error: 'Failed to create store' });
        continue;
      }
      
      console.log(`   ✅ Created store: ${targetStore.name} (ID: ${targetStore.id})`);
    } else {
      console.log(`   ✅ Found existing store: ${targetStore.name} (ID: ${targetStore.id})`);
    }
    
    // Copy inventory to target store
    const copyResult = await copyInventoryToStore(sourceInventory, targetStore.id, targetStoreName);
    results.push({
      store: targetStoreName,
      storeId: targetStore.id,
      ...copyResult
    });
  }
  
  // Step 5: Summary
  console.log('\n📊 COPY OPERATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Source Store: ${sourceStore.name}`);
  console.log(`Source Inventory Items: ${sourceInventory.length}`);
  console.log('');
  
  let totalCopied = 0;
  let totalSkipped = 0;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.store}:`);
    if (result.success) {
      console.log(`   - Copied: ${result.copied} items`);
      console.log(`   - Skipped: ${result.skipped} items (already existed)`);
      totalCopied += result.copied;
      totalSkipped += result.skipped;
    } else {
      console.log(`   - Error: ${result.error || 'Unknown error'}`);
    }
  });
  
  console.log('');
  console.log(`📈 Total Items Copied: ${totalCopied}`);
  console.log(`⚠️  Total Items Skipped: ${totalSkipped}`);
  
  const successfulStores = results.filter(r => r.success).length;
  console.log(`\n🎉 Successfully processed ${successfulStores}/${TARGET_STORES.length} target stores`);
  
  if (successfulStores === TARGET_STORES.length) {
    console.log('\n✅ Inventory copy operation completed successfully!');
  } else {
    console.log('\n⚠️  Some stores had issues. Please check the logs above.');
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
});
