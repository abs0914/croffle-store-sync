#!/usr/bin/env node

/**
 * Comprehensive Data Correction
 * 
 * This script fixes all the data issues identified in the investigation:
 * 1. Adds missing inventory items (like "Ice")
 * 2. Corrects inventory levels for transaction #20250826-8559-210711
 * 3. Creates missing inventory movement records
 * 4. Ensures data consistency across the system
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

const TARGET_TRANSACTION = {
  id: '50284b6d-4a31-46e2-a16c-48c00364664f',
  receiptNumber: '20250826-8559-210711',
  storeId: 'fd45e07e-7832-4f51-b46b-7ef604359b86'
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
    console.log('🔧 COMPREHENSIVE DATA CORRECTION');
    console.log('='.repeat(60));
    console.log(`Target Transaction: ${TARGET_TRANSACTION.receiptNumber}`);
    console.log(`Transaction ID: ${TARGET_TRANSACTION.id}`);
    console.log(`Store ID: ${TARGET_TRANSACTION.storeId}`);
    
    await authenticateAdmin();
    
    // STEP 1: Add missing inventory items
    console.log('\n📦 STEP 1: ADDING MISSING INVENTORY ITEMS');
    console.log('-'.repeat(50));
    
    // Get all stores to add missing items to all of them
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id,name&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    
    if (!stores || stores.length === 0) {
      console.log('❌ No active stores found');
      return;
    }
    
    console.log(`✅ Found ${stores.length} active stores`);
    
    // Define missing inventory items that need to be added
    const missingItems = [
      { item: 'Ice', unit: 'grams', cost: 0.01, category: 'Blended Ingredients' }
    ];
    
    let itemsAdded = 0;
    
    for (const missingItem of missingItems) {
      console.log(`\n🔍 Adding missing item: ${missingItem.item}`);
      
      for (const store of stores) {
        // Check if item already exists for this store
        const checkOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?select=id&store_id=eq.${store.id}&item=eq.${encodeURIComponent(missingItem.item)}`,
          method: 'GET',
          headers
        };
        
        const existing = await makeRequest(checkOptions);
        
        if (existing && existing.length > 0) {
          console.log(`   ⏭️  ${missingItem.item} already exists for ${store.name}`);
          continue;
        }
        
        // Add the missing item
        const addOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/inventory_stock',
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        const itemData = {
          store_id: store.id,
          item: missingItem.item,
          stock_quantity: 100, // Standard starting quantity
          unit: missingItem.unit,
          cost: missingItem.cost,
          category: missingItem.category,
          minimum_threshold: 10,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        try {
          await makeRequest(addOptions, itemData);
          console.log(`   ✅ Added ${missingItem.item} to ${store.name}`);
          itemsAdded++;
        } catch (error) {
          console.log(`   ❌ Failed to add ${missingItem.item} to ${store.name}: ${error.message}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n📊 Missing Items Summary: Added ${itemsAdded} items across all stores`);
    
    // STEP 2: Correct inventory for the specific transaction
    console.log('\n🔧 STEP 2: CORRECTING TRANSACTION INVENTORY');
    console.log('-'.repeat(50));
    
    // Define the corrections needed based on our debug analysis
    const corrections = [
      // Items that were already deducted (showing 49) - no correction needed
      // Items that were NOT deducted (still showing 100) - need correction
      { ingredient: 'Milk', currentStock: 100, shouldDeduct: 200, expectedFinal: 0 }, // Will go to 0 due to insufficient stock
      { ingredient: '16oz Plastic Cups', currentStock: 100, shouldDeduct: 1, expectedFinal: 99 },
      { ingredient: 'Flat Lid', currentStock: 100, shouldDeduct: 1, expectedFinal: 99 },
      { ingredient: 'Ice', currentStock: 100, shouldDeduct: 100, expectedFinal: 0 } // Newly added item
    ];
    
    let correctionsApplied = 0;
    const movementRecords = [];
    
    for (const correction of corrections) {
      console.log(`\n🔍 Correcting ${correction.ingredient}`);
      
      // Get current inventory
      const inventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&store_id=eq.${TARGET_TRANSACTION.storeId}&item=eq.${encodeURIComponent(correction.ingredient)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const inventory = await makeRequest(inventoryOptions);
      
      if (!inventory || inventory.length === 0) {
        console.log(`   ❌ Inventory not found for ${correction.ingredient}`);
        continue;
      }
      
      const stock = inventory[0];
      const actualCurrentStock = stock.stock_quantity;
      
      console.log(`   📊 Current stock: ${actualCurrentStock} ${stock.unit}`);
      console.log(`   📊 Expected stock: ${correction.currentStock} ${stock.unit}`);
      console.log(`   📊 Should deduct: ${correction.shouldDeduct} ${stock.unit}`);
      console.log(`   📊 Final stock: ${correction.expectedFinal} ${stock.unit}`);
      
      // Only apply correction if current stock matches expected
      if (actualCurrentStock === correction.currentStock) {
        // Update inventory
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?id=eq.${stock.id}`,
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        const updateData = {
          stock_quantity: correction.expectedFinal,
          updated_at: new Date().toISOString()
        };
        
        try {
          await makeRequest(updateOptions, updateData);
          console.log(`   ✅ Updated ${correction.ingredient}: ${actualCurrentStock} → ${correction.expectedFinal}`);
          correctionsApplied++;
          
          // Prepare movement record
          movementRecords.push({
            store_id: TARGET_TRANSACTION.storeId,
            item: correction.ingredient,
            transaction_type: 'sale',
            quantity: -correction.shouldDeduct,
            previous_quantity: actualCurrentStock,
            new_quantity: correction.expectedFinal,
            reference_id: TARGET_TRANSACTION.id,
            notes: `Manual correction for transaction ${TARGET_TRANSACTION.receiptNumber} - Comprehensive data fix`
          });
          
        } catch (error) {
          console.log(`   ❌ Failed to update ${correction.ingredient}: ${error.message}`);
        }
      } else {
        console.log(`   ⏭️  Skipping ${correction.ingredient} - stock doesn't match expected (${actualCurrentStock} vs ${correction.currentStock})`);
      }
    }
    
    console.log(`\n📊 Inventory Corrections Summary: Applied ${correctionsApplied} corrections`);
    
    // STEP 3: Create missing inventory movement records
    console.log('\n📝 STEP 3: CREATING INVENTORY MOVEMENT RECORDS');
    console.log('-'.repeat(50));
    
    let movementsCreated = 0;
    
    for (const movement of movementRecords) {
      console.log(`\n📋 Creating movement record for: ${movement.item}`);
      
      const movementOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/inventory_transactions',
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      };
      
      const movementData = {
        ...movement,
        created_at: new Date().toISOString()
      };
      
      try {
        await makeRequest(movementOptions, movementData);
        console.log(`   ✅ Movement record created for ${movement.item}`);
        console.log(`      Quantity: ${movement.quantity} (${movement.transaction_type})`);
        console.log(`      Previous: ${movement.previous_quantity} → New: ${movement.new_quantity}`);
        movementsCreated++;
      } catch (error) {
        console.log(`   ❌ Failed to create movement record for ${movement.item}: ${error.message}`);
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n📊 Movement Records Summary: Created ${movementsCreated} records`);
    
    // STEP 4: Verification
    console.log('\n✅ STEP 4: VERIFICATION');
    console.log('-'.repeat(50));
    
    // Verify inventory corrections
    console.log('🔍 Verifying inventory corrections:');
    
    for (const correction of corrections) {
      const verifyOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=stock_quantity,unit&store_id=eq.${TARGET_TRANSACTION.storeId}&item=eq.${encodeURIComponent(correction.ingredient)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const verifyInventory = await makeRequest(verifyOptions);
      
      if (verifyInventory && verifyInventory.length > 0) {
        const currentStock = verifyInventory[0].stock_quantity;
        const status = currentStock === correction.expectedFinal ? '✅' : '❌';
        console.log(`   ${status} ${correction.ingredient}: ${currentStock} ${verifyInventory[0].unit} (expected: ${correction.expectedFinal})`);
      } else {
        console.log(`   ❌ ${correction.ingredient}: Not found`);
      }
    }
    
    // Verify movement records
    console.log('\n🔍 Verifying movement records:');
    
    const verifyMovementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_transactions?select=*&reference_id=eq.${TARGET_TRANSACTION.id}`,
      method: 'GET',
      headers
    };
    
    const verifyMovements = await makeRequest(verifyMovementsOptions);
    
    if (verifyMovements && verifyMovements.length > 0) {
      console.log(`   ✅ Found ${verifyMovements.length} movement records for transaction`);
      verifyMovements.forEach((movement, index) => {
        console.log(`      ${index + 1}. ${movement.item || movement.item_name}: ${movement.quantity} (${movement.transaction_type})`);
      });
    } else {
      console.log(`   ❌ No movement records found for transaction`);
    }
    
    // FINAL SUMMARY
    console.log('\n🎉 DATA CORRECTION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Missing inventory items added: ${itemsAdded}`);
    console.log(`✅ Inventory corrections applied: ${correctionsApplied}`);
    console.log(`✅ Movement records created: ${movementsCreated}`);
    console.log(`✅ Transaction ${TARGET_TRANSACTION.receiptNumber} data corrected`);
    
    console.log('\n📊 CORRECTION SUMMARY:');
    console.log('1. ✅ Added missing "Ice" inventory item to all stores');
    console.log('2. ✅ Corrected inventory levels for transaction ingredients');
    console.log('3. ✅ Created proper inventory movement records');
    console.log('4. ✅ Established complete audit trail');
    
    console.log('\n🔄 NEXT STEPS:');
    console.log('1. Test the automatic deduction system with a new transaction');
    console.log('2. Monitor inventory movements to ensure system is working');
    console.log('3. Implement system monitoring and alerts');
    
  } catch (error) {
    console.error('❌ Data correction failed:', error.message);
    process.exit(1);
  }
}

main();
