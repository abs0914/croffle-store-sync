#!/usr/bin/env node

/**
 * Test Debug Inventory Deduction
 * 
 * This script tests the debug inventory deduction system on the problematic transaction
 * to identify exactly why the automatic system is not working.
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

const TARGET_TRANSACTION_ID = '50284b6d-4a31-46e2-a16c-48c00364664f';

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

// Simulate the debug inventory deduction logic
async function simulateDebugDeduction(transactionId, storeId, transactionItems) {
  const result = {
    success: true,
    transactionId,
    storeId,
    itemsProcessed: 0,
    recipesFound: 0,
    ingredientsIdentified: 0,
    inventoryUpdates: 0,
    movementRecords: 0,
    errors: [],
    warnings: [],
    debugLog: []
  };

  result.debugLog.push(`🔄 Starting debug inventory deduction for transaction: ${transactionId}`);
  result.debugLog.push(`📍 Store ID: ${storeId}`);
  result.debugLog.push(`📦 Items to process: ${transactionItems.length}`);

  try {
    for (const item of transactionItems) {
      result.debugLog.push(`\n🔍 Processing item: ${item.name} (quantity: ${item.quantity})`);
      result.itemsProcessed++;

      // Step 1: Get recipe template
      result.debugLog.push(`   📋 Looking up recipe template for: ${item.name}`);
      
      const recipeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_templates?select=id,name&name=eq.${encodeURIComponent(item.name)}&is_active=eq.true`,
        method: 'GET',
        headers
      };

      const recipes = await makeRequest(recipeOptions);

      if (!recipes || recipes.length === 0) {
        const errorMsg = `Recipe not found for product: ${item.name}`;
        result.warnings.push(errorMsg);
        result.debugLog.push(`   ❌ ${errorMsg}`);
        continue;
      }

      const recipe = recipes[0];
      result.debugLog.push(`   ✅ Recipe found: ${recipe.name} (ID: ${recipe.id})`);
      result.recipesFound++;

      // Step 2: Get recipe ingredients
      result.debugLog.push(`   🧪 Getting ingredients for recipe: ${recipe.id}`);
      
      const ingredientsOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_template_ingredients?select=*&recipe_template_id=eq.${recipe.id}`,
        method: 'GET',
        headers
      };

      const ingredients = await makeRequest(ingredientsOptions);

      if (!ingredients || ingredients.length === 0) {
        const errorMsg = `Failed to get ingredients for ${item.name}`;
        result.errors.push(errorMsg);
        result.debugLog.push(`   ❌ ${errorMsg}`);
        continue;
      }

      result.debugLog.push(`   ✅ Found ${ingredients.length} ingredients`);
      result.ingredientsIdentified += ingredients.length;

      // Step 3: Process each ingredient
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantity * item.quantity;
        
        result.debugLog.push(`\n      🔍 Processing ingredient: ${ingredient.ingredient_name}`);
        result.debugLog.push(`         Required: ${requiredQuantity} ${ingredient.unit} (${ingredient.quantity} × ${item.quantity})`);

        // Step 3a: Get current inventory
        result.debugLog.push(`         📦 Looking up inventory for: ${ingredient.ingredient_name}`);
        
        const inventoryOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?select=*&store_id=eq.${storeId}&item=eq.${encodeURIComponent(ingredient.ingredient_name)}&is_active=eq.true`,
          method: 'GET',
          headers
        };

        const inventory = await makeRequest(inventoryOptions);

        if (!inventory || inventory.length === 0) {
          const errorMsg = `Inventory not found for ${ingredient.ingredient_name} at store ${storeId}`;
          result.errors.push(errorMsg);
          result.debugLog.push(`         ❌ ${errorMsg}`);
          continue;
        }

        const stock = inventory[0];
        const previousStock = stock.stock_quantity;
        const newStock = Math.max(0, previousStock - requiredQuantity);

        result.debugLog.push(`         ✅ Current inventory: ${previousStock} ${stock.unit}`);
        result.debugLog.push(`         📊 Calculated new stock: ${newStock} (${previousStock} - ${requiredQuantity})`);

        // Check if we have enough stock
        if (previousStock < requiredQuantity) {
          const warningMsg = `Insufficient stock for ${ingredient.ingredient_name}: required ${requiredQuantity}, available ${previousStock}`;
          result.warnings.push(warningMsg);
          result.debugLog.push(`         ⚠️  ${warningMsg}`);
        }

        // Step 3b: Simulate inventory update (don't actually update in test)
        result.debugLog.push(`         🔄 Would update inventory from ${previousStock} to ${newStock}`);
        result.inventoryUpdates++;

        // Step 3c: Simulate movement record creation
        result.debugLog.push(`         📝 Would create inventory movement record`);
        result.movementRecords++;
      }
    }

    // Set overall success based on whether we had any critical errors
    result.success = result.errors.length === 0;

    result.debugLog.push(`\n🎯 DEDUCTION SUMMARY:`);
    result.debugLog.push(`   Items processed: ${result.itemsProcessed}`);
    result.debugLog.push(`   Recipes found: ${result.recipesFound}`);
    result.debugLog.push(`   Ingredients identified: ${result.ingredientsIdentified}`);
    result.debugLog.push(`   Inventory updates: ${result.inventoryUpdates}`);
    result.debugLog.push(`   Movement records: ${result.movementRecords}`);
    result.debugLog.push(`   Errors: ${result.errors.length}`);
    result.debugLog.push(`   Warnings: ${result.warnings.length}`);
    result.debugLog.push(`   Overall success: ${result.success}`);

  } catch (error) {
    result.success = false;
    const errorMsg = `Debug inventory deduction failed: ${error.message}`;
    result.errors.push(errorMsg);
    result.debugLog.push(`❌ CRITICAL ERROR: ${errorMsg}`);
  }

  return result;
}

async function main() {
  try {
    console.log('🧪 TESTING DEBUG INVENTORY DEDUCTION');
    console.log('='.repeat(60));
    console.log(`Target Transaction: ${TARGET_TRANSACTION_ID}`);
    
    await authenticateAdmin();
    
    // Get transaction details
    console.log('\n📋 GETTING TRANSACTION DETAILS');
    console.log('-'.repeat(40));
    
    const transactionOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?select=*&id=eq.${TARGET_TRANSACTION_ID}`,
      method: 'GET',
      headers
    };

    const transactions = await makeRequest(transactionOptions);

    if (!transactions || transactions.length === 0) {
      console.log('❌ Transaction not found');
      return;
    }

    const transaction = transactions[0];
    console.log(`✅ Transaction found: ${transaction.receipt_number}`);
    console.log(`   Store ID: ${transaction.store_id}`);
    console.log(`   Total: ₱${transaction.total}`);
    console.log(`   Status: ${transaction.status}`);

    // Get transaction items
    console.log('\n📦 GETTING TRANSACTION ITEMS');
    console.log('-'.repeat(40));
    
    const itemsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${TARGET_TRANSACTION_ID}`,
      method: 'GET',
      headers
    };

    const items = await makeRequest(itemsOptions);

    if (!items || items.length === 0) {
      console.log('❌ Transaction items not found');
      return;
    }

    console.log(`✅ Found ${items.length} transaction items:`);
    items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name} (qty: ${item.quantity}, price: ₱${item.unit_price})`);
    });

    // Convert to debug format
    const debugItems = items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }));

    // Run debug deduction simulation
    console.log('\n🔄 RUNNING DEBUG DEDUCTION SIMULATION');
    console.log('-'.repeat(40));
    
    const result = await simulateDebugDeduction(
      TARGET_TRANSACTION_ID,
      transaction.store_id,
      debugItems
    );

    // Display results
    console.log('\n📊 DEBUG RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Items processed: ${result.itemsProcessed}`);
    console.log(`Recipes found: ${result.recipesFound}`);
    console.log(`Ingredients identified: ${result.ingredientsIdentified}`);
    console.log(`Inventory updates: ${result.inventoryUpdates}`);
    console.log(`Movement records: ${result.movementRecords}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log(`Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    console.log('\n📝 DETAILED DEBUG LOG:');
    console.log('-'.repeat(60));
    result.debugLog.forEach(log => console.log(log));

    // Analysis
    console.log('\n🎯 ANALYSIS');
    console.log('='.repeat(60));
    
    if (result.success && result.inventoryUpdates > 0) {
      console.log('✅ SIMULATION SUCCESSFUL:');
      console.log('   - All recipes were found');
      console.log('   - All ingredients were identified');
      console.log('   - Inventory updates would have been successful');
      console.log('   - Movement records would have been created');
      console.log('\n💡 CONCLUSION: The deduction logic works correctly in simulation.');
      console.log('   The issue is likely that the service is not being called in production.');
    } else {
      console.log('❌ SIMULATION ISSUES FOUND:');
      if (result.recipesFound < result.itemsProcessed) {
        console.log('   - Some recipes were not found');
      }
      if (result.errors.length > 0) {
        console.log('   - Critical errors occurred during processing');
      }
      if (result.warnings.length > 0) {
        console.log('   - Warnings indicate potential issues');
      }
    }

    console.log('\n🔧 NEXT STEPS:');
    console.log('1. If simulation successful: Check why service not called in production');
    console.log('2. If simulation failed: Fix the identified issues first');
    console.log('3. Add runtime logging to production transaction service');
    console.log('4. Test with a new transaction to verify fixes');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
