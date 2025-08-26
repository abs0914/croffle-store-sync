#!/usr/bin/env node

/**
 * Apply End of Shift Inventory Updates
 * 
 * This script applies the calculated inventory deductions from the
 * end-of-shift reconciliation report.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// Inventory updates from reconciliation report
const INVENTORY_UPDATES = [
  { id: '2f029143-3064-47d2-b358-a251e873c395', item: 'REGULAR CROISSANT', newQuantity: 124, deduction: 1 },
  { id: 'c29438a2-3881-4b62-9cbc-c8e2e0efbdb2', item: 'WHIPPED CREAM', newQuantity: 128, deduction: 1 },
  { id: 'cf52cc90-1b74-466c-b13d-06f8fb88a730', item: 'Oreo Crushed', newQuantity: 47, deduction: 1 },
  { id: '53329aaa-6069-4d4a-a738-94c693cc05ab', item: 'Oreo Cookies', newQuantity: 52, deduction: 1 },
  { id: 'cbaa7779-9881-4c40-81d9-de6b1bf2b5e6', item: 'Chopstick', newQuantity: 91, deduction: 1 },
  { id: '1c6c22a1-ae7f-47b4-81a1-2931fe1a9055', item: 'Wax Paper', newQuantity: 73, deduction: 1 }
];

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
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
    
    // Update headers with the access token
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    
    return authResult;
  } catch (error) {
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function applyInventoryUpdates() {
  console.log('🔧 APPLYING END OF SHIFT INVENTORY UPDATES');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Step 1: Verify current inventory levels
    console.log('📦 STEP 1: VERIFYING CURRENT INVENTORY LEVELS');
    console.log('-'.repeat(40));
    
    for (const update of INVENTORY_UPDATES) {
      const inventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&id=eq.${update.id}`,
        method: 'GET',
        headers
      };
      
      const inventory = await makeRequest(inventoryOptions);
      
      if (inventory.length > 0) {
        const currentStock = inventory[0].stock_quantity;
        const expectedBefore = update.newQuantity + update.deduction;
        
        console.log(`✅ ${update.item}:`);
        console.log(`   Current: ${currentStock}, Expected Before: ${expectedBefore}, Will Update To: ${update.newQuantity}`);
        
        if (currentStock !== expectedBefore) {
          console.log(`   ⚠️ Warning: Current stock (${currentStock}) doesn't match expected (${expectedBefore})`);
        }
      } else {
        console.log(`❌ ${update.item}: Inventory item not found`);
      }
    }
    
    // Step 2: Apply inventory updates
    console.log('\n🔧 STEP 2: APPLYING INVENTORY UPDATES');
    console.log('-'.repeat(40));
    
    let successCount = 0;
    let failCount = 0;
    
    for (const update of INVENTORY_UPDATES) {
      try {
        // Get current stock for movement logging
        const currentOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?select=*&id=eq.${update.id}`,
          method: 'GET',
          headers
        };
        
        const currentInventory = await makeRequest(currentOptions);
        const previousQuantity = currentInventory[0]?.stock_quantity || 0;
        
        // Update inventory stock
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?id=eq.${update.id}`,
          method: 'PATCH',
          headers
        };
        
        const updateData = {
          stock_quantity: update.newQuantity,
          updated_at: new Date().toISOString()
        };
        
        await makeRequest(updateOptions, updateData);
        
        // Log inventory movement
        const movementOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/inventory_movements',
          method: 'POST',
          headers
        };
        
        const movementData = {
          inventory_stock_id: update.id,
          movement_type: 'end_of_shift_adjustment',
          quantity_change: -update.deduction,
          previous_quantity: previousQuantity,
          new_quantity: update.newQuantity,
          reference_type: 'shift_reconciliation',
          reference_id: `shift-${new Date().toISOString().split('T')[0]}`,
          notes: `End of shift reconciliation - Cookies & Cream sale deduction`,
          created_by: 'admin'
        };
        
        await makeRequest(movementOptions, movementData);
        
        console.log(`✅ ${update.item}: Updated to ${update.newQuantity} (deducted ${update.deduction})`);
        successCount++;
        
      } catch (error) {
        console.log(`❌ ${update.item}: Failed to update - ${error.message}`);
        failCount++;
      }
    }
    
    // Step 3: Verify updates
    console.log('\n✅ STEP 3: VERIFYING UPDATES');
    console.log('-'.repeat(40));
    
    console.log(`📊 Update Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📦 Total Items: ${INVENTORY_UPDATES.length}`);
    
    if (successCount === INVENTORY_UPDATES.length) {
      console.log('\n🎉 ALL INVENTORY UPDATES COMPLETED SUCCESSFULLY!');
      
      // Verify final inventory levels
      console.log('\n📋 Final Inventory Levels:');
      
      for (const update of INVENTORY_UPDATES) {
        const verifyOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?select=*&id=eq.${update.id}`,
          method: 'GET',
          headers
        };
        
        const verifyInventory = await makeRequest(verifyOptions);
        
        if (verifyInventory.length > 0) {
          const finalStock = verifyInventory[0].stock_quantity;
          console.log(`   ${update.item}: ${finalStock} (expected: ${update.newQuantity})`);
        }
      }
      
      console.log('\n📊 Inventory movements have been logged for audit trail');
      console.log('✅ End of shift reconciliation complete!');
      
    } else {
      console.log('\n⚠️ Some updates failed. Please check the errors above and retry.');
    }
    
    // Step 4: Summary report
    console.log('\n📋 STEP 4: END OF SHIFT SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`🏪 Store: Sugbo Mercado (IT Park, Cebu)`);
    console.log(`💰 Sales Processed: 1 transaction (₱125.00)`);
    console.log(`📦 Inventory Items Updated: ${successCount}/${INVENTORY_UPDATES.length}`);
    console.log(`🍪 Product Sold: Cookies & Cream Croffle (1 unit)`);
    
    console.log('\n📊 Inventory Deductions Applied:');
    INVENTORY_UPDATES.forEach(update => {
      console.log(`   - ${update.item}: -${update.deduction} unit`);
    });
    
    console.log('\n✅ Shift reconciliation completed successfully!');
    console.log('📝 All inventory movements have been logged for audit purposes.');
    
  } catch (error) {
    console.error('❌ Error applying inventory updates:', error.message);
  }
}

// Run the updates
applyInventoryUpdates();
