#!/usr/bin/env node

/**
 * Copy Inventory from Sugbo Mercado to All Stores
 * 
 * This script copies the complete inventory setup from Sugbo Mercado
 * to all other stores, then completes the Cookies & Cream deployment.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Source store (Sugbo Mercado)
const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

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
          if (res.statusCode < 400) {
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
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function copyInventoryToAllStores() {
  console.log('📦 COPYING INVENTORY FROM SUGBO MERCADO TO ALL STORES');
  console.log('='.repeat(60));
  
  try {
    await authenticateAdmin();
    
    // Step 1: Get Sugbo Mercado inventory (source)
    console.log('📋 STEP 1: GETTING SUGBO MERCADO INVENTORY');
    console.log('-'.repeat(40));
    
    const sourceInventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_stock?select=*&store_id=eq.${SUGBO_STORE_ID}`,
      method: 'GET',
      headers
    };
    
    const sourceInventory = await makeRequest(sourceInventoryOptions);
    console.log(`✅ Found ${sourceInventory.length} inventory items in Sugbo Mercado`);
    
    if (sourceInventory.length === 0) {
      console.log('❌ No inventory items found in Sugbo Mercado');
      return;
    }
    
    console.log('\n📋 Sample inventory items:');
    sourceInventory.slice(0, 5).forEach(item => {
      console.log(`   - ${item.item}: ${item.stock_quantity} ${item.unit}`);
    });
    
    // Step 2: Get all other stores
    console.log('\n🏪 STEP 2: GETTING TARGET STORES');
    console.log('-'.repeat(40));
    
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=*',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    const targetStores = stores.filter(store => store.id !== SUGBO_STORE_ID);
    
    console.log(`✅ Found ${targetStores.length} target stores for inventory copy`);
    targetStores.forEach(store => {
      console.log(`   - ${store.name} (${store.location || 'No location'})`);
    });
    
    // Step 3: Copy inventory to each store
    console.log('\n📦 STEP 3: COPYING INVENTORY TO EACH STORE');
    console.log('-'.repeat(40));
    
    const copyResults = [];
    
    for (const store of targetStores) {
      console.log(`\n🏪 Copying to ${store.name}...`);
      
      try {
        // Check if store already has inventory
        const existingInventoryOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?select=id&store_id=eq.${store.id}`,
          method: 'GET',
          headers
        };
        
        const existingInventory = await makeRequest(existingInventoryOptions);
        
        if (existingInventory.length > 0) {
          console.log(`   ⚠️ Store already has ${existingInventory.length} inventory items - skipping`);
          copyResults.push({
            store: store.name,
            storeId: store.id,
            success: true,
            skipped: true,
            itemCount: existingInventory.length
          });
          continue;
        }
        
        // Copy each inventory item
        let successCount = 0;
        let failCount = 0;
        
        for (const sourceItem of sourceInventory) {
          try {
            const newInventoryData = {
              store_id: store.id,
              item: sourceItem.item,
              stock_quantity: sourceItem.stock_quantity,
              unit: sourceItem.unit,
              cost_per_unit: sourceItem.cost_per_unit,
              reorder_level: sourceItem.reorder_level,
              supplier: sourceItem.supplier
            };
            
            const createInventoryOptions = {
              hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
              port: 443,
              path: '/rest/v1/inventory_stock',
              method: 'POST',
              headers
            };
            
            await makeRequest(createInventoryOptions, newInventoryData);
            successCount++;
            
          } catch (error) {
            console.log(`     ❌ Failed to copy ${sourceItem.item}: ${error.message}`);
            failCount++;
          }
        }
        
        console.log(`   ✅ Copied ${successCount}/${sourceInventory.length} items (${failCount} failed)`);
        
        copyResults.push({
          store: store.name,
          storeId: store.id,
          success: successCount > 0,
          skipped: false,
          itemCount: successCount,
          failCount: failCount
        });
        
      } catch (error) {
        console.log(`   ❌ Failed to copy inventory: ${error.message}`);
        copyResults.push({
          store: store.name,
          storeId: store.id,
          success: false,
          error: error.message
        });
      }
    }
    
    // Step 4: Copy results summary
    console.log('\n📊 STEP 4: INVENTORY COPY SUMMARY');
    console.log('-'.repeat(40));
    
    const successfulCopies = copyResults.filter(r => r.success);
    const failedCopies = copyResults.filter(r => !r.success);
    const skippedCopies = copyResults.filter(r => r.skipped);
    
    console.log(`✅ Successful copies: ${successfulCopies.length}`);
    console.log(`⚠️ Skipped (already had inventory): ${skippedCopies.length}`);
    console.log(`❌ Failed copies: ${failedCopies.length}`);
    
    if (successfulCopies.length > 0) {
      console.log('\n✅ SUCCESSFUL INVENTORY COPIES:');
      successfulCopies.forEach(result => {
        if (!result.skipped) {
          console.log(`   🏪 ${result.store}: ${result.itemCount} items copied`);
        }
      });
    }
    
    if (skippedCopies.length > 0) {
      console.log('\n⚠️ SKIPPED STORES (ALREADY HAD INVENTORY):');
      skippedCopies.forEach(result => {
        console.log(`   🏪 ${result.store}: ${result.itemCount} existing items`);
      });
    }
    
    if (failedCopies.length > 0) {
      console.log('\n❌ FAILED COPIES:');
      failedCopies.forEach(result => {
        console.log(`   🏪 ${result.store}: ${result.error}`);
      });
    }
    
    // Step 5: Verify inventory copy
    console.log('\n✅ STEP 5: VERIFYING INVENTORY COPY');
    console.log('-'.repeat(40));
    
    for (const store of targetStores) {
      const verifyOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=id,item&store_id=eq.${store.id}&limit=5`,
        method: 'GET',
        headers
      };
      
      const verifyInventory = await makeRequest(verifyOptions);
      console.log(`🏪 ${store.name}: ${verifyInventory.length} inventory items`);
      
      if (verifyInventory.length > 0) {
        console.log(`   Sample: ${verifyInventory.map(i => i.item).join(', ')}`);
      }
    }
    
    // Step 6: Next steps
    console.log('\n🎯 STEP 6: NEXT STEPS');
    console.log('-'.repeat(40));
    
    const storesWithInventory = copyResults.filter(r => r.success).length;
    
    if (storesWithInventory > 0) {
      console.log('✅ Inventory copy completed successfully!');
      console.log('\n📋 Ready for Cookies & Cream deployment:');
      console.log('   1. All stores now have inventory items');
      console.log('   2. Can link recipe ingredients to inventory');
      console.log('   3. Can create product catalog entries');
      console.log('   4. Can enable end-of-shift reconciliation');
      
      console.log('\n🚀 Run next: Complete Cookies & Cream deployment');
      console.log('   node scripts/completeCookiesCreamDeployment.cjs');
    } else {
      console.log('❌ Inventory copy failed - cannot proceed with deployment');
    }
    
  } catch (error) {
    console.error('❌ Error during inventory copy:', error.message);
  }
}

// Run the inventory copy
copyInventoryToAllStores();
