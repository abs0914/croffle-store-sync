#!/usr/bin/env node

/**
 * End-to-End System Test
 * 
 * This script performs a comprehensive test of the inventory deduction system
 * by creating a test transaction and verifying that inventory is properly deducted.
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
    console.log('🧪 END-TO-END SYSTEM TEST');
    console.log('='.repeat(50));
    console.log('Testing automatic inventory deduction system');
    
    await authenticateAdmin();
    
    // STEP 1: Select test store and products
    console.log('\n🏪 STEP 1: SELECTING TEST STORE AND PRODUCTS');
    console.log('-'.repeat(40));
    
    // Get first active store
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=*&is_active=eq.true&limit=1',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    
    if (!stores || stores.length === 0) {
      console.log('❌ No active stores found');
      return;
    }
    
    const testStore = stores[0];
    console.log(`✅ Test store: ${testStore.name} (${testStore.id})`);
    
    // Define test products
    const testProducts = [
      { name: 'Caramel Delight Croffle', quantity: 1, price: 125 }
    ];
    
    console.log(`✅ Test products: ${testProducts.map(p => p.name).join(', ')}`);
    
    // STEP 2: Record pre-test inventory levels
    console.log('\n📦 STEP 2: RECORDING PRE-TEST INVENTORY');
    console.log('-'.repeat(40));
    
    const preTestInventory = {};
    
    // Get all ingredients for test products
    for (const product of testProducts) {
      console.log(`\n🔍 Getting ingredients for: ${product.name}`);
      
      // Get recipe
      const recipeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_templates?select=id,name&name=eq.${encodeURIComponent(product.name)}`,
        method: 'GET',
        headers
      };
      
      const recipes = await makeRequest(recipeOptions);
      
      if (!recipes || recipes.length === 0) {
        console.log(`   ❌ Recipe not found for ${product.name}`);
        continue;
      }
      
      const recipe = recipes[0];
      console.log(`   ✅ Recipe found: ${recipe.name}`);
      
      // Get ingredients
      const ingredientsOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_template_ingredients?select=*&recipe_template_id=eq.${recipe.id}`,
        method: 'GET',
        headers
      };
      
      const ingredients = await makeRequest(ingredientsOptions);
      
      if (!ingredients || ingredients.length === 0) {
        console.log(`   ❌ No ingredients found for ${product.name}`);
        continue;
      }
      
      console.log(`   ✅ Found ${ingredients.length} ingredients`);
      
      // Record current inventory for each ingredient
      for (const ingredient of ingredients) {
        const inventoryOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?select=*&store_id=eq.${testStore.id}&item=eq.${encodeURIComponent(ingredient.ingredient_name)}&is_active=eq.true`,
          method: 'GET',
          headers
        };
        
        const inventory = await makeRequest(inventoryOptions);
        
        if (inventory && inventory.length > 0) {
          const stock = inventory[0];
          const requiredQuantity = ingredient.quantity * product.quantity;
          
          preTestInventory[ingredient.ingredient_name] = {
            current: stock.stock_quantity,
            required: requiredQuantity,
            expected: stock.stock_quantity - requiredQuantity,
            unit: stock.unit
          };
          
          console.log(`      ${ingredient.ingredient_name}: ${stock.stock_quantity} ${stock.unit} (will deduct ${requiredQuantity})`);
        } else {
          console.log(`      ❌ ${ingredient.ingredient_name}: Not found in inventory`);
        }
      }
    }
    
    console.log(`\n📊 Pre-test inventory recorded for ${Object.keys(preTestInventory).length} ingredients`);
    
    // STEP 3: Create test transaction
    console.log('\n📝 STEP 3: CREATING TEST TRANSACTION');
    console.log('-'.repeat(40));
    
    const receiptNumber = `TEST-E2E-${Date.now()}`;
    const totalAmount = testProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    
    console.log(`Creating transaction: ${receiptNumber}`);
    console.log(`Total amount: ₱${totalAmount}`);
    
    const transactionData = {
      store_id: testStore.id,
      user_id: '00000000-0000-0000-0000-000000000000',
      shift_id: '00000000-0000-0000-0000-000000000000',
      total: totalAmount,
      subtotal: totalAmount,
      tax: 0,
      discount: 0,
      payment_method: 'cash',
      amount_tendered: totalAmount,
      change: 0,
      status: 'completed',
      receipt_number: receiptNumber
    };
    
    const transactionOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/transactions',
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' }
    };
    
    const transaction = await makeRequest(transactionOptions, transactionData);
    
    if (!transaction || transaction.length === 0) {
      console.log('❌ Failed to create test transaction');
      return;
    }
    
    const createdTransaction = transaction[0];
    console.log(`✅ Transaction created: ${createdTransaction.id}`);
    
    // STEP 4: Add transaction items
    console.log('\n📋 STEP 4: ADDING TRANSACTION ITEMS');
    console.log('-'.repeat(40));
    
    for (const product of testProducts) {
      const itemData = {
        transaction_id: createdTransaction.id,
        name: product.name,
        quantity: product.quantity,
        unit_price: product.price,
        total_price: product.price * product.quantity
      };
      
      const itemOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/transaction_items',
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      };
      
      await makeRequest(itemOptions, itemData);
      console.log(`✅ Added item: ${product.name} (qty: ${product.quantity})`);
    }
    
    // STEP 5: Wait and check if automatic deduction occurred
    console.log('\n⏰ STEP 5: WAITING FOR AUTOMATIC DEDUCTION');
    console.log('-'.repeat(40));
    
    console.log('Waiting 5 seconds for automatic deduction to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // STEP 6: Verify inventory deduction
    console.log('\n🔍 STEP 6: VERIFYING INVENTORY DEDUCTION');
    console.log('-'.repeat(40));
    
    let deductionSuccess = true;
    const deductionResults = [];
    
    for (const [ingredientName, preTest] of Object.entries(preTestInventory)) {
      console.log(`\n🔍 Checking ${ingredientName}:`);
      console.log(`   Pre-test: ${preTest.current} ${preTest.unit}`);
      console.log(`   Expected: ${preTest.expected} ${preTest.unit} (after deducting ${preTest.required})`);
      
      // Get current inventory
      const currentInventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=stock_quantity,unit&store_id=eq.${testStore.id}&item=eq.${encodeURIComponent(ingredientName)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const currentInventory = await makeRequest(currentInventoryOptions);
      
      if (currentInventory && currentInventory.length > 0) {
        const currentStock = currentInventory[0].stock_quantity;
        const wasDeducted = currentStock === preTest.expected;
        
        console.log(`   Actual: ${currentStock} ${currentInventory[0].unit}`);
        console.log(`   Status: ${wasDeducted ? '✅ DEDUCTED' : '❌ NOT DEDUCTED'}`);
        
        deductionResults.push({
          ingredient: ingredientName,
          preTest: preTest.current,
          expected: preTest.expected,
          actual: currentStock,
          deducted: wasDeducted
        });
        
        if (!wasDeducted) {
          deductionSuccess = false;
        }
      } else {
        console.log(`   ❌ Inventory not found`);
        deductionSuccess = false;
      }
    }
    
    // STEP 7: Check for inventory movements
    console.log('\n📊 STEP 7: CHECKING INVENTORY MOVEMENTS');
    console.log('-'.repeat(40));
    
    const movementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_transactions?select=*&reference_id=eq.${createdTransaction.id}`,
      method: 'GET',
      headers
    };
    
    const movements = await makeRequest(movementsOptions);
    
    let movementsFound = false;
    
    if (movements && movements.length > 0) {
      console.log(`✅ Found ${movements.length} inventory movement records:`);
      movements.forEach((movement, index) => {
        console.log(`   ${index + 1}. ${movement.item_name || movement.item}: ${movement.quantity} (${movement.transaction_type})`);
      });
      movementsFound = true;
    } else {
      console.log('❌ No inventory movement records found');
    }
    
    // STEP 8: Test results
    console.log('\n🎯 STEP 8: TEST RESULTS');
    console.log('='.repeat(50));
    
    const overallSuccess = deductionSuccess && movementsFound;
    
    console.log(`📊 TEST SUMMARY:`);
    console.log(`   Transaction created: ✅`);
    console.log(`   Items recorded: ✅`);
    console.log(`   Inventory deduction: ${deductionSuccess ? '✅' : '❌'}`);
    console.log(`   Movement records: ${movementsFound ? '✅' : '❌'}`);
    console.log(`   Overall success: ${overallSuccess ? '✅' : '❌'}`);
    
    if (overallSuccess) {
      console.log('\n🎉 SUCCESS: Automatic inventory deduction system is working!');
      console.log('✅ All ingredients were properly deducted');
      console.log('✅ Inventory movement records were created');
      console.log('✅ System integration is functional');
    } else {
      console.log('\n❌ FAILURE: Automatic inventory deduction system has issues');
      
      if (!deductionSuccess) {
        console.log('❌ Inventory was not properly deducted');
        const failedDeductions = deductionResults.filter(r => !r.deducted);
        console.log(`   Failed ingredients: ${failedDeductions.map(f => f.ingredient).join(', ')}`);
      }
      
      if (!movementsFound) {
        console.log('❌ No inventory movement records were created');
      }
    }
    
    console.log('\n📋 DETAILED RESULTS:');
    deductionResults.forEach(result => {
      const status = result.deducted ? '✅' : '❌';
      console.log(`   ${status} ${result.ingredient}: ${result.preTest} → ${result.actual} (expected: ${result.expected})`);
    });
    
    console.log('\n🔧 RECOMMENDATIONS:');
    if (overallSuccess) {
      console.log('✅ System is working correctly - no action needed');
      console.log('✅ Monitor future transactions to ensure continued functionality');
    } else {
      console.log('❌ System needs attention:');
      console.log('   1. Check if inventory deduction service is being called');
      console.log('   2. Verify database triggers are working');
      console.log('   3. Add logging to track deduction attempts');
      console.log('   4. Test with different products and stores');
    }
    
    console.log(`\n📝 TEST TRANSACTION DETAILS:`);
    console.log(`   Transaction ID: ${createdTransaction.id}`);
    console.log(`   Receipt: ${receiptNumber}`);
    console.log(`   Store: ${testStore.name}`);
    console.log(`   Products: ${testProducts.map(p => p.name).join(', ')}`);
    
  } catch (error) {
    console.error('❌ End-to-end test failed:', error.message);
    process.exit(1);
  }
}

main();
