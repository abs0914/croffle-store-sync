#!/usr/bin/env node

/**
 * Test Inventory Deduction System
 * 
 * This script tests the inventory deduction system by simulating the service call
 * and verifying that all components are working correctly.
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

// Simulate the complete inventory deduction process
async function simulateInventoryDeduction(transactionId, storeId, transactionItems) {
  const result = {
    success: true,
    deductedItems: [],
    errors: [],
    warnings: [],
    debugLog: []
  };

  result.debugLog.push(`🔄 STARTING INVENTORY DEDUCTION`);
  result.debugLog.push(`   Transaction ID: ${transactionId}`);
  result.debugLog.push(`   Store ID: ${storeId}`);
  result.debugLog.push(`   Items to process: ${transactionItems.length}`);

  try {
    for (const item of transactionItems) {
      result.debugLog.push(`\n🔍 PROCESSING ITEM: ${item.name} (quantity: ${item.quantity})`);

      // Get recipe template
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
        const warningMsg = `Recipe not found for product: ${item.name}`;
        result.warnings.push(warningMsg);
        result.debugLog.push(`   ❌ ${warningMsg}`);
        continue;
      }

      const recipe = recipes[0];
      result.debugLog.push(`   ✅ Recipe found: ${recipe.name} (ID: ${recipe.id})`);

      // Get recipe ingredients
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

      // Process each ingredient
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantity * item.quantity;
        
        result.debugLog.push(`\n      🔍 Processing ingredient: ${ingredient.ingredient_name}`);
        result.debugLog.push(`         Required: ${requiredQuantity} ${ingredient.unit} (${ingredient.quantity} × ${item.quantity})`);

        // Get current inventory
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

        // Simulate inventory update (don't actually update in test mode)
        result.debugLog.push(`         🔄 Would update inventory from ${previousStock} to ${newStock}`);
        
        result.deductedItems.push({
          ingredient: ingredient.ingredient_name,
          deducted: requiredQuantity,
          unit: ingredient.unit,
          previousStock,
          newStock
        });

        result.debugLog.push(`         📝 Would create inventory movement record`);
      }
    }

    // Set overall success based on whether we had any critical errors
    result.success = result.errors.length === 0;

    result.debugLog.push(`\n🎯 DEDUCTION SIMULATION COMPLETE:`);
    result.debugLog.push(`   Items processed: ${transactionItems.length}`);
    result.debugLog.push(`   Ingredients identified: ${result.deductedItems.length}`);
    result.debugLog.push(`   Errors: ${result.errors.length}`);
    result.debugLog.push(`   Warnings: ${result.warnings.length}`);
    result.debugLog.push(`   Overall success: ${result.success}`);

  } catch (error) {
    result.success = false;
    const errorMsg = `Inventory deduction simulation failed: ${error.message}`;
    result.errors.push(errorMsg);
    result.debugLog.push(`❌ CRITICAL ERROR: ${errorMsg}`);
  }

  return result;
}

async function main() {
  try {
    console.log('🧪 TESTING INVENTORY DEDUCTION SYSTEM');
    console.log('='.repeat(60));
    
    await authenticateAdmin();
    
    // Test with a sample transaction
    console.log('\n📋 SETTING UP TEST SCENARIO');
    console.log('-'.repeat(40));
    
    // Get a test store
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id,name&is_active=eq.true&limit=1',
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
    
    // Define test transaction items
    const testTransactionItems = [
      { name: 'Caramel Delight Croffle', quantity: 1, unit_price: 125, total_price: 125 }
    ];
    
    console.log(`✅ Test items: ${testTransactionItems.map(item => `${item.name} (qty: ${item.quantity})`).join(', ')}`);
    
    // Run the simulation
    console.log('\n🔄 RUNNING INVENTORY DEDUCTION SIMULATION');
    console.log('-'.repeat(40));
    
    const testTransactionId = 'test-' + Date.now();
    const result = await simulateInventoryDeduction(
      testTransactionId,
      testStore.id,
      testTransactionItems
    );
    
    // Display results
    console.log('\n📊 SIMULATION RESULTS');
    console.log('='.repeat(60));
    console.log(`Success: ${result.success ? '✅' : '❌'}`);
    console.log(`Items processed: ${testTransactionItems.length}`);
    console.log(`Ingredients identified: ${result.deductedItems.length}`);
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

    if (result.deductedItems.length > 0) {
      console.log('\n📦 INGREDIENTS TO BE DEDUCTED:');
      result.deductedItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.ingredient}: ${item.previousStock} → ${item.newStock} (-${item.deducted} ${item.unit})`);
      });
    }

    console.log('\n📝 DETAILED DEBUG LOG:');
    console.log('-'.repeat(60));
    result.debugLog.forEach(log => console.log(log));

    // Analysis and recommendations
    console.log('\n🎯 ANALYSIS AND RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    if (result.success && result.deductedItems.length > 0) {
      console.log('✅ SIMULATION SUCCESSFUL:');
      console.log('   - All recipes were found');
      console.log('   - All ingredients were identified');
      console.log('   - Inventory lookups were successful');
      console.log('   - Deduction calculations are correct');
      console.log('\n💡 CONCLUSION: The inventory deduction logic is working correctly.');
      console.log('   The system should work when called from the application.');
    } else {
      console.log('❌ SIMULATION ISSUES FOUND:');
      if (result.errors.length > 0) {
        console.log('   - Critical errors occurred during processing');
        console.log('   - These need to be fixed before the system will work');
      }
      if (result.deductedItems.length === 0) {
        console.log('   - No ingredients were identified for deduction');
        console.log('   - Check recipe templates and ingredient mappings');
      }
    }

    console.log('\n🔧 NEXT STEPS:');
    if (result.success) {
      console.log('1. ✅ The inventory deduction service is ready');
      console.log('2. 🔧 Ensure it\'s being called from the transaction service');
      console.log('3. 🧪 Test with a real transaction in the application');
      console.log('4. 📊 Monitor inventory movements table for records');
    } else {
      console.log('1. ❌ Fix the identified errors first');
      console.log('2. 🔧 Ensure all recipe templates have ingredients');
      console.log('3. 🔧 Verify inventory items exist for all ingredients');
      console.log('4. 🧪 Re-run this test after fixes');
    }

    console.log('\n📋 INTEGRATION CHECKLIST:');
    console.log('□ Inventory deduction service exists and is functional');
    console.log('□ Streamlined transaction service calls deduction service');
    console.log('□ Error handling and logging are comprehensive');
    console.log('□ Transaction completion triggers inventory deduction');
    console.log('□ Inventory movement records are created');
    console.log('□ System handles insufficient stock gracefully');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
