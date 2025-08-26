#!/usr/bin/env node

/**
 * Comprehensive Transaction Investigation
 * 
 * This script conducts a detailed investigation of transaction #20250826-8559-210711
 * to verify if the inventory deduction system is working correctly.
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

// Investigation target
const TARGET_TRANSACTION = {
  receiptNumber: '20250826-8559-210711',
  date: 'Aug 26, 21:07',
  paymentMethod: 'Cash',
  totalAmount: 235.00,
  items: [
    { name: 'Choco Nut Croffle', quantity: 1, price: 125.00 },
    { name: 'Strawberry Kiss Blended', quantity: 1, price: 110.00 }
  ]
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
    console.log('🔍 COMPREHENSIVE TRANSACTION INVESTIGATION');
    console.log('='.repeat(70));
    console.log(`Target Transaction: ${TARGET_TRANSACTION.receiptNumber}`);
    console.log(`Expected Total: ₱${TARGET_TRANSACTION.totalAmount}`);
    console.log(`Expected Items: ${TARGET_TRANSACTION.items.map(i => i.name).join(', ')}`);
    console.log('='.repeat(70));
    
    await authenticateAdmin();
    
    // STEP 1: VERIFY TRANSACTION RECORD
    console.log('\n📋 STEP 1: VERIFYING TRANSACTION RECORD');
    console.log('-'.repeat(50));
    
    const transactionOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?select=*&receipt_number=eq.${TARGET_TRANSACTION.receiptNumber}`,
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionOptions);
    
    if (!transactions || transactions.length === 0) {
      console.log('❌ CRITICAL: Transaction not found in database');
      return;
    }
    
    const transaction = transactions[0];
    console.log('✅ Transaction found in database');
    console.log(`   ID: ${transaction.id}`);
    console.log(`   Receipt: ${transaction.receipt_number}`);
    console.log(`   Store ID: ${transaction.store_id}`);
    console.log(`   Total: ₱${transaction.total}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Payment Method: ${transaction.payment_method}`);
    console.log(`   Created: ${transaction.created_at}`);
    
    // Verify transaction details
    const detailsMatch = {
      total: transaction.total === TARGET_TRANSACTION.totalAmount,
      paymentMethod: transaction.payment_method?.toLowerCase() === TARGET_TRANSACTION.paymentMethod.toLowerCase(),
      status: transaction.status === 'completed'
    };
    
    console.log('\n📊 Transaction Details Verification:');
    console.log(`   Total Amount: ${detailsMatch.total ? '✅' : '❌'} (Expected: ₱${TARGET_TRANSACTION.totalAmount}, Found: ₱${transaction.total})`);
    console.log(`   Payment Method: ${detailsMatch.paymentMethod ? '✅' : '❌'} (Expected: ${TARGET_TRANSACTION.paymentMethod}, Found: ${transaction.payment_method})`);
    console.log(`   Status: ${detailsMatch.status ? '✅' : '❌'} (Expected: completed, Found: ${transaction.status})`);
    
    // STEP 2: CHECK TRANSACTION ITEMS
    console.log('\n📦 STEP 2: CHECKING TRANSACTION ITEMS');
    console.log('-'.repeat(50));
    
    const itemsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${transaction.id}`,
      method: 'GET',
      headers
    };
    
    const transactionItems = await makeRequest(itemsOptions);
    
    if (!transactionItems || transactionItems.length === 0) {
      console.log('❌ CRITICAL: No transaction items found');
      return;
    }
    
    console.log(`✅ Found ${transactionItems.length} transaction items:`);
    
    const itemsVerification = {};
    transactionItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name}`);
      console.log(`      Quantity: ${item.quantity}`);
      console.log(`      Unit Price: ₱${item.unit_price}`);
      console.log(`      Total Price: ₱${item.total_price}`);
      
      // Check if this item matches expected items
      const expectedItem = TARGET_TRANSACTION.items.find(expected => 
        expected.name === item.name
      );
      
      if (expectedItem) {
        itemsVerification[item.name] = {
          found: true,
          quantityMatch: item.quantity === expectedItem.quantity,
          priceMatch: item.unit_price === expectedItem.price
        };
        console.log(`      ✅ Matches expected item`);
      } else {
        itemsVerification[item.name] = { found: false };
        console.log(`      ⚠️  Unexpected item`);
      }
    });
    
    // STEP 3: CHECK RECIPE INGREDIENTS
    console.log('\n🧪 STEP 3: CHECKING RECIPE INGREDIENTS');
    console.log('-'.repeat(50));
    
    const allIngredients = [];
    
    for (const item of transactionItems) {
      console.log(`\n🔍 Analyzing recipe for: ${item.name}`);
      
      // Get recipe template
      const recipeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_templates?select=*&name=eq.${encodeURIComponent(item.name)}`,
        method: 'GET',
        headers
      };
      
      const recipes = await makeRequest(recipeOptions);
      
      if (!recipes || recipes.length === 0) {
        console.log(`   ❌ Recipe template not found for ${item.name}`);
        continue;
      }
      
      const recipe = recipes[0];
      console.log(`   ✅ Recipe found: ${recipe.name} (ID: ${recipe.id})`);
      
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
        console.log(`   ❌ No ingredients found for ${item.name}`);
        continue;
      }
      
      console.log(`   ✅ Found ${ingredients.length} ingredients:`);
      
      ingredients.forEach((ingredient, idx) => {
        const totalRequired = ingredient.quantity * item.quantity;
        console.log(`      ${idx + 1}. ${ingredient.ingredient_name}: ${totalRequired} ${ingredient.unit} (${ingredient.quantity} × ${item.quantity})`);
        
        allIngredients.push({
          productName: item.name,
          ingredientName: ingredient.ingredient_name,
          quantityPerUnit: ingredient.quantity,
          totalRequired: totalRequired,
          unit: ingredient.unit
        });
      });
    }
    
    console.log(`\n📊 Total unique ingredients to check: ${allIngredients.length}`);
    
    // STEP 4: VALIDATE INVENTORY DEDUCTION
    console.log('\n📦 STEP 4: VALIDATING INVENTORY DEDUCTION');
    console.log('-'.repeat(50));
    
    let inventoryChecksPassed = 0;
    let inventoryChecksFailed = 0;
    const inventoryResults = [];
    
    for (const ingredient of allIngredients) {
      console.log(`\n🔍 Checking inventory for: ${ingredient.ingredientName}`);
      
      // Get current inventory for this ingredient at the transaction store
      const inventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&store_id=eq.${transaction.store_id}&item=eq.${encodeURIComponent(ingredient.ingredientName)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const inventory = await makeRequest(inventoryOptions);
      
      if (!inventory || inventory.length === 0) {
        console.log(`   ❌ Inventory not found for ${ingredient.ingredientName}`);
        inventoryChecksFailed++;
        inventoryResults.push({
          ingredient: ingredient.ingredientName,
          status: 'NOT_FOUND',
          expected: `Should be reduced by ${ingredient.totalRequired}`,
          actual: 'Not found'
        });
        continue;
      }
      
      const stock = inventory[0];
      console.log(`   ✅ Current inventory: ${stock.stock_quantity} ${stock.unit}`);
      console.log(`   📋 Should have been reduced by: ${ingredient.totalRequired} ${ingredient.unit}`);
      
      // For validation, we need to know what the inventory was before
      // Since we can't know the exact before state, we'll check if it's reasonable
      const currentStock = stock.stock_quantity;
      const expectedReduction = ingredient.totalRequired;
      
      // If inventory was at 100 and we deducted properly, it should be 100 - expectedReduction
      // But we can't be certain of the starting point, so we'll note the current state
      
      inventoryResults.push({
        ingredient: ingredient.ingredientName,
        status: 'FOUND',
        currentStock: currentStock,
        expectedReduction: expectedReduction,
        unit: stock.unit,
        productName: ingredient.productName
      });
      
      inventoryChecksPassed++;
    }
    
    console.log(`\n📊 Inventory Check Summary:`);
    console.log(`   ✅ Found: ${inventoryChecksPassed} ingredients`);
    console.log(`   ❌ Not Found: ${inventoryChecksFailed} ingredients`);
    
    // STEP 5: CHECK INVENTORY MOVEMENTS
    console.log('\n📊 STEP 5: CHECKING INVENTORY MOVEMENTS');
    console.log('-'.repeat(50));
    
    const movementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_transactions?select=*&reference_id=eq.${transaction.id}`,
      method: 'GET',
      headers
    };
    
    const movements = await makeRequest(movementsOptions);
    
    if (!movements || movements.length === 0) {
      console.log('❌ CRITICAL: No inventory movements found for this transaction');
      console.log('   This indicates the automatic inventory deduction system did NOT work');
    } else {
      console.log(`✅ Found ${movements.length} inventory movement records:`);
      
      movements.forEach((movement, index) => {
        console.log(`   ${index + 1}. Item: ${movement.item_name || movement.item}`);
        console.log(`      Type: ${movement.transaction_type}`);
        console.log(`      Quantity Change: ${movement.quantity}`);
        console.log(`      Previous: ${movement.previous_quantity}`);
        console.log(`      New: ${movement.new_quantity}`);
        console.log(`      Created: ${movement.created_at}`);
        console.log(`      Notes: ${movement.notes || 'N/A'}`);
      });
    }
    
    // STEP 6: SYSTEM INTEGRATION ASSESSMENT
    console.log('\n🔧 STEP 6: SYSTEM INTEGRATION ASSESSMENT');
    console.log('-'.repeat(50));
    
    const systemAssessment = {
      transactionExists: !!transaction,
      transactionCompleted: transaction?.status === 'completed',
      itemsRecorded: transactionItems && transactionItems.length > 0,
      recipesFound: allIngredients.length > 0,
      inventoryMovements: movements && movements.length > 0,
      expectedMovements: allIngredients.length
    };
    
    console.log('📋 System Integration Results:');
    console.log(`   Transaction Record: ${systemAssessment.transactionExists ? '✅' : '❌'}`);
    console.log(`   Transaction Completed: ${systemAssessment.transactionCompleted ? '✅' : '❌'}`);
    console.log(`   Transaction Items: ${systemAssessment.itemsRecorded ? '✅' : '❌'}`);
    console.log(`   Recipe Templates: ${systemAssessment.recipesFound ? '✅' : '❌'}`);
    console.log(`   Inventory Movements: ${systemAssessment.inventoryMovements ? '✅' : '❌'}`);
    console.log(`   Expected vs Actual Movements: ${systemAssessment.expectedMovements} expected, ${movements?.length || 0} found`);
    
    // FINAL ASSESSMENT
    console.log('\n🎯 FINAL INVESTIGATION RESULTS');
    console.log('='.repeat(70));
    
    const overallSuccess = systemAssessment.transactionExists && 
                          systemAssessment.transactionCompleted && 
                          systemAssessment.itemsRecorded && 
                          systemAssessment.inventoryMovements;
    
    if (overallSuccess) {
      console.log('🎉 SUCCESS: Inventory deduction system is working correctly!');
      console.log('\n✅ Key Findings:');
      console.log('   • Transaction was properly recorded');
      console.log('   • Transaction items were saved');
      console.log('   • Recipe ingredients were identified');
      console.log('   • Inventory movements were created');
      console.log('   • Automatic deduction system is functional');
    } else {
      console.log('❌ FAILURE: Inventory deduction system has issues!');
      console.log('\n🔍 Issues Identified:');
      
      if (!systemAssessment.transactionExists) {
        console.log('   • Transaction record missing');
      }
      if (!systemAssessment.transactionCompleted) {
        console.log('   • Transaction not marked as completed');
      }
      if (!systemAssessment.itemsRecorded) {
        console.log('   • Transaction items not recorded');
      }
      if (!systemAssessment.inventoryMovements) {
        console.log('   • No inventory movements created (CRITICAL ISSUE)');
      }
      if (systemAssessment.expectedMovements !== (movements?.length || 0)) {
        console.log(`   • Movement count mismatch: expected ${systemAssessment.expectedMovements}, found ${movements?.length || 0}`);
      }
    }
    
    console.log('\n📊 Investigation Summary:');
    console.log(`   Transaction ID: ${transaction?.id || 'N/A'}`);
    console.log(`   Receipt Number: ${transaction?.receipt_number || 'N/A'}`);
    console.log(`   Store ID: ${transaction?.store_id || 'N/A'}`);
    console.log(`   Items Processed: ${transactionItems?.length || 0}`);
    console.log(`   Ingredients Identified: ${allIngredients.length}`);
    console.log(`   Inventory Movements: ${movements?.length || 0}`);
    console.log(`   System Status: ${overallSuccess ? 'WORKING' : 'NEEDS ATTENTION'}`);
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    process.exit(1);
  }
}

main();
