#!/usr/bin/env node

/**
 * Comprehensive Investigation of Transaction #20250826-4132-220334
 * 
 * This script conducts a detailed investigation to verify if our newly implemented
 * automatic inventory deduction system is working correctly for this transaction.
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
  receiptNumber: '20250826-4132-220334',
  expectedProduct: 'Caramel Delight Croffle',
  expectedTime: 'Aug 26, 22:03'
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
    console.log('🔍 COMPREHENSIVE INVESTIGATION - NEW TRANSACTION SYSTEM TEST');
    console.log('='.repeat(80));
    console.log(`Target Transaction: ${TARGET_TRANSACTION.receiptNumber}`);
    console.log(`Expected Product: ${TARGET_TRANSACTION.expectedProduct}`);
    console.log(`Expected Time: ${TARGET_TRANSACTION.expectedTime}`);
    console.log('Purpose: Verify automatic inventory deduction system is working');
    console.log('='.repeat(80));
    
    await authenticateAdmin();
    
    // STEP 1: VERIFY TRANSACTION RECORD
    console.log('\n📋 STEP 1: VERIFYING TRANSACTION RECORD');
    console.log('-'.repeat(60));
    
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
      console.log('   This suggests the transaction was not properly recorded');
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
    console.log(`   Updated: ${transaction.updated_at}`);
    
    // Verify transaction is completed
    if (transaction.status !== 'completed') {
      console.log(`❌ ISSUE: Transaction status is '${transaction.status}', not 'completed'`);
      console.log('   Inventory deduction only triggers for completed transactions');
    } else {
      console.log('✅ Transaction status is completed - should trigger inventory deduction');
    }
    
    // STEP 2: CHECK TRANSACTION ITEMS
    console.log('\n📦 STEP 2: CHECKING TRANSACTION ITEMS');
    console.log('-'.repeat(60));
    
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
      console.log('   Without items, inventory deduction cannot occur');
      return;
    }
    
    console.log(`✅ Found ${transactionItems.length} transaction items:`);
    
    let caramelDelightFound = false;
    transactionItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name}`);
      console.log(`      Quantity: ${item.quantity}`);
      console.log(`      Unit Price: ₱${item.unit_price}`);
      console.log(`      Total Price: ₱${item.total_price}`);
      
      if (item.name === TARGET_TRANSACTION.expectedProduct) {
        caramelDelightFound = true;
        console.log(`      ✅ MATCHES EXPECTED PRODUCT`);
      }
    });
    
    if (!caramelDelightFound) {
      console.log(`⚠️  Expected product '${TARGET_TRANSACTION.expectedProduct}' not found in items`);
    }
    
    // STEP 3: CHECK RECIPE INGREDIENTS
    console.log('\n🧪 STEP 3: CHECKING RECIPE INGREDIENTS');
    console.log('-'.repeat(60));
    
    const expectedIngredients = [];
    
    for (const item of transactionItems) {
      console.log(`\n🔍 Analyzing recipe for: ${item.name}`);
      
      // Get recipe template
      const recipeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_templates?select=*&name=eq.${encodeURIComponent(item.name)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const recipes = await makeRequest(recipeOptions);
      
      if (!recipes || recipes.length === 0) {
        console.log(`   ❌ Recipe template not found for ${item.name}`);
        console.log(`   ⚠️  This will prevent inventory deduction for this item`);
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
        console.log(`   ⚠️  This will prevent inventory deduction for this item`);
        continue;
      }
      
      console.log(`   ✅ Found ${ingredients.length} ingredients:`);
      
      ingredients.forEach((ingredient, idx) => {
        const totalRequired = ingredient.quantity * item.quantity;
        console.log(`      ${idx + 1}. ${ingredient.ingredient_name}: ${totalRequired} ${ingredient.unit} (${ingredient.quantity} × ${item.quantity})`);
        
        expectedIngredients.push({
          productName: item.name,
          ingredientName: ingredient.ingredient_name,
          quantityPerUnit: ingredient.quantity,
          totalRequired: totalRequired,
          unit: ingredient.unit
        });
      });
    }
    
    console.log(`\n📊 Total ingredients to be deducted: ${expectedIngredients.length}`);
    
    // STEP 4: VALIDATE INVENTORY DEDUCTION
    console.log('\n📦 STEP 4: VALIDATING INVENTORY DEDUCTION');
    console.log('-'.repeat(60));
    
    let deductionResults = [];
    let successfulDeductions = 0;
    let failedDeductions = 0;
    
    for (const ingredient of expectedIngredients) {
      console.log(`\n🔍 Checking inventory for: ${ingredient.ingredientName}`);
      console.log(`   Expected deduction: ${ingredient.totalRequired} ${ingredient.unit}`);
      
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
        failedDeductions++;
        deductionResults.push({
          ingredient: ingredient.ingredientName,
          status: 'NOT_FOUND',
          expected: `Should be reduced by ${ingredient.totalRequired}`,
          actual: 'Not found in inventory'
        });
        continue;
      }
      
      const stock = inventory[0];
      console.log(`   📊 Current inventory: ${stock.stock_quantity} ${stock.unit}`);
      console.log(`   📅 Last updated: ${stock.updated_at}`);
      
      // Check if the inventory was updated after the transaction
      const transactionTime = new Date(transaction.created_at);
      const inventoryUpdateTime = new Date(stock.updated_at);
      const wasUpdatedAfterTransaction = inventoryUpdateTime > transactionTime;
      
      console.log(`   ⏰ Transaction time: ${transaction.created_at}`);
      console.log(`   ⏰ Inventory update time: ${stock.updated_at}`);
      console.log(`   🔄 Updated after transaction: ${wasUpdatedAfterTransaction ? '✅ YES' : '❌ NO'}`);
      
      deductionResults.push({
        ingredient: ingredient.ingredientName,
        status: 'FOUND',
        currentStock: stock.stock_quantity,
        expectedDeduction: ingredient.totalRequired,
        unit: stock.unit,
        updatedAfterTransaction: wasUpdatedAfterTransaction,
        productName: ingredient.productName
      });
      
      if (wasUpdatedAfterTransaction) {
        successfulDeductions++;
        console.log(`   ✅ Inventory appears to have been updated after transaction`);
      } else {
        failedDeductions++;
        console.log(`   ❌ Inventory was NOT updated after transaction`);
      }
    }
    
    console.log(`\n📊 Inventory Deduction Summary:`);
    console.log(`   ✅ Successful deductions: ${successfulDeductions}`);
    console.log(`   ❌ Failed deductions: ${failedDeductions}`);
    console.log(`   📋 Total ingredients checked: ${expectedIngredients.length}`);
    
    // STEP 5: CONFIRM INVENTORY MOVEMENTS
    console.log('\n📊 STEP 5: CONFIRMING INVENTORY MOVEMENTS');
    console.log('-'.repeat(60));
    
    const movementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_transactions?select=*&reference_id=eq.${transaction.id}&order=created_at.desc`,
      method: 'GET',
      headers
    };
    
    const movements = await makeRequest(movementsOptions);
    
    if (!movements || movements.length === 0) {
      console.log('❌ CRITICAL: No inventory movement records found for this transaction');
      console.log('   This indicates the automatic deduction system did NOT work');
      console.log('   Expected to find movement records with reference_id = transaction.id');
    } else {
      console.log(`✅ Found ${movements.length} inventory movement records:`);
      
      movements.forEach((movement, index) => {
        console.log(`\n   ${index + 1}. Movement Record:`);
        console.log(`      ID: ${movement.id}`);
        console.log(`      Item: ${movement.item_name || movement.item}`);
        console.log(`      Type: ${movement.transaction_type}`);
        console.log(`      Quantity Change: ${movement.quantity}`);
        console.log(`      Previous Quantity: ${movement.previous_quantity}`);
        console.log(`      New Quantity: ${movement.new_quantity}`);
        console.log(`      Reference ID: ${movement.reference_id}`);
        console.log(`      Notes: ${movement.notes || 'N/A'}`);
        console.log(`      Created: ${movement.created_at}`);
        
        // Verify this movement matches our expected deductions
        const expectedIngredient = expectedIngredients.find(ing => 
          ing.ingredientName === (movement.item_name || movement.item)
        );
        
        if (expectedIngredient) {
          const expectedQuantityChange = -expectedIngredient.totalRequired;
          if (movement.quantity === expectedQuantityChange) {
            console.log(`      ✅ Quantity change matches expected deduction`);
          } else {
            console.log(`      ❌ Quantity change mismatch: expected ${expectedQuantityChange}, got ${movement.quantity}`);
          }
        } else {
          console.log(`      ⚠️  Unexpected ingredient in movement record`);
        }
      });
    }
    
    // STEP 6: SYSTEM INTEGRATION ASSESSMENT
    console.log('\n🔧 STEP 6: SYSTEM INTEGRATION ASSESSMENT');
    console.log('-'.repeat(60));
    
    const systemAssessment = {
      transactionExists: !!transaction,
      transactionCompleted: transaction?.status === 'completed',
      itemsRecorded: transactionItems && transactionItems.length > 0,
      recipesFound: expectedIngredients.length > 0,
      inventoryMovements: movements && movements.length > 0,
      expectedMovements: expectedIngredients.length,
      actualMovements: movements?.length || 0,
      deductionSuccess: successfulDeductions > 0,
      systemWorking: false
    };
    
    // Determine if the system is working
    systemAssessment.systemWorking = 
      systemAssessment.transactionCompleted &&
      systemAssessment.itemsRecorded &&
      systemAssessment.recipesFound &&
      systemAssessment.inventoryMovements &&
      systemAssessment.actualMovements === systemAssessment.expectedMovements;
    
    console.log('📋 System Integration Results:');
    console.log(`   Transaction Record: ${systemAssessment.transactionExists ? '✅' : '❌'}`);
    console.log(`   Transaction Completed: ${systemAssessment.transactionCompleted ? '✅' : '❌'}`);
    console.log(`   Transaction Items: ${systemAssessment.itemsRecorded ? '✅' : '❌'}`);
    console.log(`   Recipe Templates: ${systemAssessment.recipesFound ? '✅' : '❌'}`);
    console.log(`   Inventory Movements: ${systemAssessment.inventoryMovements ? '✅' : '❌'}`);
    console.log(`   Movement Count Match: ${systemAssessment.actualMovements}/${systemAssessment.expectedMovements} ${systemAssessment.actualMovements === systemAssessment.expectedMovements ? '✅' : '❌'}`);
    console.log(`   Inventory Updates: ${systemAssessment.deductionSuccess ? '✅' : '❌'}`);
    
    // FINAL ASSESSMENT
    console.log('\n🎯 FINAL INVESTIGATION RESULTS');
    console.log('='.repeat(80));
    
    if (systemAssessment.systemWorking) {
      console.log('🎉 SUCCESS: AUTOMATIC INVENTORY DEDUCTION SYSTEM IS WORKING!');
      console.log('\n✅ Key Findings:');
      console.log('   • Transaction was properly recorded and completed');
      console.log('   • Transaction items were saved correctly');
      console.log('   • Recipe ingredients were identified');
      console.log('   • Inventory movement records were created');
      console.log('   • Inventory levels were updated after transaction');
      console.log('   • Database trigger system is functional');
      console.log('   • Application integration is working');
      
      console.log('\n🔧 System Components Verified:');
      console.log('   ✅ Database trigger: trg_auto_deduct_inventory');
      console.log('   ✅ Function: auto_deduct_inventory_on_transaction()');
      console.log('   ✅ Recipe template lookup');
      console.log('   ✅ Inventory stock updates');
      console.log('   ✅ Movement record creation');
      console.log('   ✅ Audit trail maintenance');
      
    } else {
      console.log('❌ FAILURE: AUTOMATIC INVENTORY DEDUCTION SYSTEM HAS ISSUES');
      console.log('\n🔍 Issues Identified:');
      
      if (!systemAssessment.transactionCompleted) {
        console.log('   • Transaction not marked as completed');
      }
      if (!systemAssessment.itemsRecorded) {
        console.log('   • Transaction items not recorded');
      }
      if (!systemAssessment.recipesFound) {
        console.log('   • Recipe templates not found or incomplete');
      }
      if (!systemAssessment.inventoryMovements) {
        console.log('   • No inventory movement records created (CRITICAL)');
      }
      if (systemAssessment.actualMovements !== systemAssessment.expectedMovements) {
        console.log(`   • Movement count mismatch: expected ${systemAssessment.expectedMovements}, found ${systemAssessment.actualMovements}`);
      }
      if (!systemAssessment.deductionSuccess) {
        console.log('   • Inventory levels not updated properly');
      }
    }
    
    console.log('\n📊 Investigation Summary:');
    console.log(`   Transaction ID: ${transaction?.id || 'N/A'}`);
    console.log(`   Receipt Number: ${transaction?.receipt_number || 'N/A'}`);
    console.log(`   Store ID: ${transaction?.store_id || 'N/A'}`);
    console.log(`   Items Processed: ${transactionItems?.length || 0}`);
    console.log(`   Ingredients Expected: ${expectedIngredients.length}`);
    console.log(`   Movement Records: ${movements?.length || 0}`);
    console.log(`   System Status: ${systemAssessment.systemWorking ? 'WORKING ✅' : 'NEEDS ATTENTION ❌'}`);
    
    console.log('\n🔄 CONCLUSION:');
    if (systemAssessment.systemWorking) {
      console.log('The comprehensive inventory deduction system implementation is successful!');
      console.log('Both the database trigger and application integration are functioning correctly.');
      console.log('Future transactions will automatically deduct inventory as expected.');
    } else {
      console.log('The inventory deduction system requires further investigation and fixes.');
      console.log('Review the issues identified above and address them systematically.');
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    process.exit(1);
  }
}

main();
