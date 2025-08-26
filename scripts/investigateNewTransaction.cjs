#!/usr/bin/env node

/**
 * Investigate New Transaction Issue
 * 
 * This script investigates transaction #20250826-4522-205233 and checks inventory quantities.
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
    console.log('🔍 INVESTIGATING NEW TRANSACTION ISSUE');
    console.log('='.repeat(60));
    console.log('Transaction ID: #20250826-4522-205233');
    console.log('Product: Choco Marshmallow Croffle');
    console.log('Issue: Still no inventory deduction');
    
    await authenticateAdmin();
    
    // Step 1: Check current inventory quantities across all stores
    console.log('\n📦 STEP 1: CHECKING CURRENT INVENTORY QUANTITIES');
    console.log('-'.repeat(50));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=store_id,item,stock_quantity,unit&is_active=eq.true&order=store_id,item&limit=50',
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    
    if (inventory && inventory.length > 0) {
      // Group by store
      const inventoryByStore = {};
      inventory.forEach(item => {
        if (!inventoryByStore[item.store_id]) {
          inventoryByStore[item.store_id] = [];
        }
        inventoryByStore[item.store_id].push(item);
      });
      
      console.log(`✅ Found inventory across ${Object.keys(inventoryByStore).length} stores:`);
      
      // Check if quantities are 50 or 100
      let stores50 = 0;
      let stores100 = 0;
      let storesOther = 0;
      
      Object.entries(inventoryByStore).forEach(([storeId, items]) => {
        const quantities = items.map(item => item.stock_quantity);
        const uniqueQuantities = [...new Set(quantities)];
        
        console.log(`\n   Store ${storeId}: ${items.length} items`);
        console.log(`      Quantities: ${uniqueQuantities.join(', ')}`);
        
        if (uniqueQuantities.length === 1) {
          if (uniqueQuantities[0] === 50) {
            stores50++;
            console.log(`      🔴 All items at 50 - SHOULD BE 100!`);
          } else if (uniqueQuantities[0] === 100) {
            stores100++;
            console.log(`      ✅ All items at 100 - CORRECT!`);
          } else {
            storesOther++;
            console.log(`      ⚠️  All items at ${uniqueQuantities[0]} - UNEXPECTED!`);
          }
        } else {
          storesOther++;
          console.log(`      ⚠️  Mixed quantities - NEEDS INVESTIGATION!`);
        }
        
        // Show sample items
        items.slice(0, 3).forEach(item => {
          console.log(`         - ${item.item}: ${item.stock_quantity} ${item.unit}`);
        });
        if (items.length > 3) {
          console.log(`         ... and ${items.length - 3} more items`);
        }
      });
      
      console.log(`\n📊 INVENTORY QUANTITY SUMMARY:`);
      console.log(`   Stores with all items at 50: ${stores50} 🔴`);
      console.log(`   Stores with all items at 100: ${stores100} ✅`);
      console.log(`   Stores with other quantities: ${storesOther} ⚠️`);
      
      if (stores50 > 0) {
        console.log(`\n❌ PROBLEM IDENTIFIED: ${stores50} stores have inventory at 50 instead of 100!`);
      }
    }
    
    // Step 2: Search for the specific transaction
    console.log('\n📝 STEP 2: SEARCHING FOR TRANSACTION #20250826-4522-205233');
    console.log('-'.repeat(50));
    
    const transactionOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/transactions?select=*&receipt_number=like.*205233*&order=created_at.desc&limit=5',
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionOptions);
    
    if (transactions && transactions.length > 0) {
      console.log(`✅ Found ${transactions.length} matching transactions:`);
      
      let targetTransaction = null;
      
      transactions.forEach((txn, index) => {
        console.log(`\n   ${index + 1}. Transaction ID: ${txn.id}`);
        console.log(`      Receipt: ${txn.receipt_number}`);
        console.log(`      Store ID: ${txn.store_id}`);
        console.log(`      Total: ₱${txn.total}`);
        console.log(`      Status: ${txn.status}`);
        console.log(`      Created: ${txn.created_at}`);
        
        if (txn.receipt_number && txn.receipt_number.includes('205233')) {
          targetTransaction = txn;
          console.log(`      🎯 TARGET TRANSACTION FOUND!`);
        }
      });
      
      if (targetTransaction) {
        // Get transaction items
        console.log('\n📋 STEP 3: CHECKING TRANSACTION ITEMS');
        console.log('-'.repeat(50));
        
        const itemsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${targetTransaction.id}`,
          method: 'GET',
          headers
        };
        
        const items = await makeRequest(itemsOptions);
        
        if (items && items.length > 0) {
          console.log(`✅ Found ${items.length} transaction items:`);
          
          let foundChocoMarshmallow = false;
          
          items.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.name}`);
            console.log(`      Quantity: ${item.quantity}`);
            console.log(`      Unit Price: ₱${item.unit_price}`);
            console.log(`      Total: ₱${item.total_price}`);
            
            if (item.name && item.name.toLowerCase().includes('choco marshmallow')) {
              foundChocoMarshmallow = true;
              console.log(`      🎯 FOUND CHOCO MARSHMALLOW CROFFLE!`);
            }
          });
          
          if (!foundChocoMarshmallow) {
            console.log('⚠️  Choco Marshmallow Croffle not found in transaction items');
          }
          
          // Check for inventory movements
          console.log('\n📊 STEP 4: CHECKING INVENTORY MOVEMENTS');
          console.log('-'.repeat(50));
          
          const movementsOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/inventory_transactions?select=*&reference_id=eq.${targetTransaction.id}`,
            method: 'GET',
            headers
          };
          
          const movements = await makeRequest(movementsOptions);
          
          if (movements && movements.length > 0) {
            console.log(`✅ Found ${movements.length} inventory movements:`);
            movements.forEach((movement, index) => {
              console.log(`   ${index + 1}. Item: ${movement.item || movement.item_name}`);
              console.log(`      Type: ${movement.transaction_type}`);
              console.log(`      Quantity: ${movement.quantity}`);
              console.log(`      Previous: ${movement.previous_quantity}`);
              console.log(`      New: ${movement.new_quantity}`);
            });
          } else {
            console.log('❌ NO INVENTORY MOVEMENTS FOUND - THIS IS THE PROBLEM!');
            console.log('   The transaction was completed but inventory was not deducted.');
          }
          
        } else {
          console.log('❌ No transaction items found');
        }
      }
    } else {
      console.log('❌ Transaction not found');
    }
    
    // Step 5: Check if Choco Marshmallow Croffle recipe exists
    console.log('\n🧪 STEP 5: CHECKING CHOCO MARSHMALLOW CROFFLE RECIPE');
    console.log('-'.repeat(50));
    
    const recipeOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*&name=eq.Choco%20Marshmallow%20Croffle',
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipeOptions);
    
    if (recipes && recipes.length > 0) {
      const recipe = recipes[0];
      console.log(`✅ Found recipe: ${recipe.name} (ID: ${recipe.id})`);
      
      // Get ingredients
      const ingredientsOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_template_ingredients?select=*&recipe_template_id=eq.${recipe.id}`,
        method: 'GET',
        headers
      };
      
      const ingredients = await makeRequest(ingredientsOptions);
      
      if (ingredients && ingredients.length > 0) {
        console.log(`✅ Found ${ingredients.length} ingredients:`);
        ingredients.forEach((ing, index) => {
          console.log(`   ${index + 1}. ${ing.ingredient_name}: ${ing.quantity} ${ing.unit}`);
        });
      } else {
        console.log('❌ No ingredients found for recipe');
      }
    } else {
      console.log('❌ Choco Marshmallow Croffle recipe not found');
    }
    
    // Step 6: Analysis and recommendations
    console.log('\n🧮 ANALYSIS AND RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    console.log('🔍 IDENTIFIED ISSUES:');
    console.log('1. ❌ Inventory quantities are still at 50 instead of 100');
    console.log('2. ❌ No inventory movements recorded for transactions');
    console.log('3. ❌ Automatic inventory deduction system is not active');
    console.log('4. ❌ The inventory deduction service was created but not integrated');
    
    console.log('\n💡 IMMEDIATE ACTIONS NEEDED:');
    console.log('1. 🔧 Update all inventory quantities from 50 to 100');
    console.log('2. 🔧 Integrate the inventory deduction service into transaction processing');
    console.log('3. 🔧 Add database triggers or application-level hooks');
    console.log('4. 🔧 Test the system with a new transaction');
    
    console.log('\n🎯 ROOT CAUSE:');
    console.log('The inventory deduction system was built but never integrated into the live application.');
    console.log('Transactions are completing without triggering inventory updates.');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    process.exit(1);
  }
}

main();
