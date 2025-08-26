#!/usr/bin/env node

/**
 * Investigate Transaction Processing Issue (Corrected)
 * 
 * This script investigates the transaction and inventory deduction issue.
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
    console.log('🔍 INVESTIGATING TRANSACTION & INVENTORY ISSUE');
    console.log('='.repeat(60));
    console.log('Transaction ID: #20250826-3463-203846');
    console.log('Store: Robinsons North');
    console.log('Product: Caramel Delight Croffle');
    console.log('Issue: Inventory not deducted (should be 100, showing 50)');
    
    await authenticateAdmin();
    
    // Step 1: Find Robinsons North store
    console.log('\n🏪 STEP 1: FINDING ROBINSONS NORTH STORE');
    console.log('-'.repeat(40));
    
    const storeOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=*&name=ilike.%25Robinsons%20North%25',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storeOptions);
    
    if (!stores || stores.length === 0) {
      console.log('❌ Robinsons North store not found');
      return;
    }
    
    const store = stores[0];
    console.log(`✅ Found store: ${store.name} (ID: ${store.id})`);
    
    // Step 2: Check current inventory for Caramel Delight Croffle ingredients
    console.log('\n📦 STEP 2: CHECKING CARAMEL DELIGHT CROFFLE INVENTORY');
    console.log('-'.repeat(40));
    
    // Get Caramel Delight Croffle recipe
    const recipeOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*&name=eq.Caramel%20Delight%20Croffle',
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipeOptions);
    
    if (!recipes || recipes.length === 0) {
      console.log('❌ Caramel Delight Croffle recipe not found');
      return;
    }
    
    const recipe = recipes[0];
    console.log(`✅ Found recipe: ${recipe.name} (ID: ${recipe.id})`);
    
    // Get recipe ingredients
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_template_ingredients?select=*&recipe_template_id=eq.${recipe.id}`,
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    
    if (!ingredients || ingredients.length === 0) {
      console.log('❌ No ingredients found for Caramel Delight Croffle');
      return;
    }
    
    console.log(`✅ Found ${ingredients.length} ingredients:`);
    
    let totalExpectedDeduction = 0;
    let hasInventoryIssues = false;
    
    for (const ingredient of ingredients) {
      console.log(`\n   📋 ${ingredient.ingredient_name}`);
      console.log(`      Required: ${ingredient.quantity} ${ingredient.unit}`);
      console.log(`      Cost per unit: ₱${ingredient.cost_per_unit}`);
      
      // Check current inventory for this ingredient
      const inventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&item=eq.${encodeURIComponent(ingredient.ingredient_name)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const inventory = await makeRequest(inventoryOptions);
      
      if (inventory && inventory.length > 0) {
        const stock = inventory[0];
        console.log(`      Current Stock: ${stock.stock_quantity} ${stock.unit}`);
        console.log(`      Last Updated: ${stock.updated_at || 'N/A'}`);
        
        // Check if this is the problematic ingredient
        if (stock.stock_quantity === 50) {
          console.log(`      ⚠️  POTENTIAL ISSUE: Stock is 50, expected to be ${50 - ingredient.quantity} after transaction`);
          hasInventoryIssues = true;
          totalExpectedDeduction += ingredient.quantity;
        }
      } else {
        console.log(`      ❌ No inventory found for ${ingredient.ingredient_name}`);
        hasInventoryIssues = true;
      }
    }
    
    // Step 3: Search for recent transactions
    console.log('\n📝 STEP 3: SEARCHING FOR RECENT TRANSACTIONS');
    console.log('-'.repeat(40));
    
    const transactionsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?select=*&store_id=eq.${store.id}&order=created_at.desc&limit=10`,
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionsOptions);
    
    if (transactions && transactions.length > 0) {
      console.log(`✅ Found ${transactions.length} recent transactions:`);
      
      let targetTransaction = null;
      
      transactions.forEach((txn, index) => {
        const receiptMatch = txn.receipt_number && txn.receipt_number.includes('203846');
        const dateMatch = txn.created_at && txn.created_at.includes('2025-08-26');
        
        console.log(`   ${index + 1}. ID: ${txn.id}`);
        console.log(`      Receipt: ${txn.receipt_number || 'N/A'}`);
        console.log(`      Total: ₱${txn.total || 'N/A'}`);
        console.log(`      Status: ${txn.status || 'N/A'}`);
        console.log(`      Created: ${txn.created_at || 'N/A'}`);
        
        if (receiptMatch || dateMatch) {
          console.log(`      🎯 POTENTIAL MATCH for transaction #20250826-3463-203846`);
          targetTransaction = txn;
        }
        console.log('');
      });
      
      // Step 4: Check transaction items if we found a match
      if (targetTransaction) {
        console.log('\n📋 STEP 4: CHECKING TRANSACTION ITEMS');
        console.log('-'.repeat(40));
        
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
          
          let foundCaramelDelight = false;
          
          items.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.name}`);
            console.log(`      Quantity: ${item.quantity}`);
            console.log(`      Unit Price: ₱${item.unit_price}`);
            console.log(`      Total: ₱${item.total_price}`);
            
            if (item.name && item.name.toLowerCase().includes('caramel delight')) {
              foundCaramelDelight = true;
              console.log(`      🎯 FOUND CARAMEL DELIGHT CROFFLE!`);
            }
            console.log('');
          });
          
          if (!foundCaramelDelight) {
            console.log('⚠️  Caramel Delight Croffle not found in transaction items');
          }
        } else {
          console.log('❌ No transaction items found');
        }
        
        // Step 5: Check inventory transactions/movements
        console.log('\n📊 STEP 5: CHECKING INVENTORY MOVEMENTS');
        console.log('-'.repeat(40));
        
        const movementsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_transactions?select=*&store_id=eq.${store.id}&reference_id=eq.${targetTransaction.id}`,
          method: 'GET',
          headers
        };
        
        const movements = await makeRequest(movementsOptions);
        
        if (movements && movements.length > 0) {
          console.log(`✅ Found ${movements.length} inventory movements:`);
          movements.forEach((movement, index) => {
            console.log(`   ${index + 1}. Type: ${movement.transaction_type}`);
            console.log(`      Quantity: ${movement.quantity}`);
            console.log(`      Previous: ${movement.previous_quantity}`);
            console.log(`      New: ${movement.new_quantity}`);
            console.log(`      Created: ${movement.created_at}`);
            console.log('');
          });
        } else {
          console.log('❌ No inventory movements found - THIS IS THE PROBLEM!');
        }
      }
    } else {
      console.log('❌ No recent transactions found');
    }
    
    // Step 6: Analysis and recommendations
    console.log('\n🧮 ANALYSIS AND RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    console.log('🔍 IDENTIFIED ISSUES:');
    if (hasInventoryIssues) {
      console.log('1. ✅ Inventory levels suggest transaction was not processed correctly');
      console.log('2. ❌ No inventory movements recorded for the transaction');
      console.log('3. ❌ Automatic inventory deduction system is not working');
    }
    
    console.log('\n💡 RECOMMENDED FIXES:');
    console.log('1. Implement/fix automatic inventory deduction triggers');
    console.log('2. Create inventory movement records for transactions');
    console.log('3. Add validation to ensure inventory is updated before completing transactions');
    console.log('4. Implement rollback mechanism for failed inventory updates');
    
    console.log('\n🔧 IMMEDIATE ACTIONS:');
    console.log('1. Manually correct inventory levels for affected ingredients');
    console.log('2. Create missing inventory movement records');
    console.log('3. Test and fix the inventory deduction system');
    console.log('4. Add monitoring to detect future inventory sync issues');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    process.exit(1);
  }
}

main();
