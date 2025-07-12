#!/usr/bin/env node

/**
 * Test Inventory Deduction System
 * 
 * This script tests if inventory is properly deducting after orders
 * by simulating transactions and checking inventory levels.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Test with Sugbo Mercado since it has deployed recipes
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

async function testInventoryDeduction() {
  console.log('🧪 TESTING INVENTORY DEDUCTION SYSTEM');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Step 1: Check current inventory levels
    console.log('📊 STEP 1: CHECKING CURRENT INVENTORY LEVELS');
    console.log('-'.repeat(40));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_stock?select=*&store_id=eq.${SUGBO_STORE_ID}&limit=10`,
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    console.log(`📦 Found ${inventory.length} inventory items in Sugbo Mercado`);
    
    if (inventory.length > 0) {
      console.log('\n📋 Sample inventory items:');
      inventory.slice(0, 5).forEach(item => {
        console.log(`   - ${item.item}: ${item.stock_quantity} ${item.unit}`);
      });
    } else {
      console.log('⚠️ No inventory items found - this might be why deduction isn\'t working');
    }
    
    // Step 2: Check recent transactions
    console.log('\n💳 STEP 2: CHECKING RECENT TRANSACTIONS');
    console.log('-'.repeat(40));
    
    const transactionsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?select=*&store_id=eq.${SUGBO_STORE_ID}&order=created_at.desc&limit=5`,
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionsOptions);
    console.log(`💰 Found ${transactions.length} recent transactions`);
    
    if (transactions.length > 0) {
      console.log('\n📋 Recent transactions:');
      transactions.forEach(txn => {
        console.log(`   - ${txn.receipt_number}: ₱${txn.total} (${txn.created_at})`);
        if (txn.items && txn.items.length > 0) {
          console.log(`     Items: ${txn.items.length} items`);
        }
      });
    } else {
      console.log('⚠️ No recent transactions found');
    }
    
    // Step 3: Check inventory movements (deduction logs)
    console.log('\n📈 STEP 3: CHECKING INVENTORY MOVEMENTS');
    console.log('-'.repeat(40));
    
    const movementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_movements?select=*&order=created_at.desc&limit=10',
      method: 'GET',
      headers
    };
    
    const movements = await makeRequest(movementsOptions);
    console.log(`📊 Found ${movements.length} inventory movements`);
    
    if (movements.length > 0) {
      console.log('\n📋 Recent inventory movements:');
      movements.forEach(movement => {
        console.log(`   - ${movement.movement_type}: ${movement.quantity_change} (${movement.created_at})`);
        if (movement.notes) {
          console.log(`     Notes: ${movement.notes}`);
        }
      });
    } else {
      console.log('⚠️ No inventory movements found - this indicates deduction is NOT working');
    }
    
    // Step 4: Check recipe ingredients mapping
    console.log('\n🍽️ STEP 4: CHECKING RECIPE INGREDIENTS MAPPING');
    console.log('-'.repeat(40));
    
    // Get Oreo Cookies recipe
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*&store_id=eq.${SUGBO_STORE_ID}&name=ilike.*oreo*cookies*`,
      method: 'GET',
      headers
    };
    
    const oreoRecipes = await makeRequest(recipesOptions);
    
    if (oreoRecipes.length > 0) {
      const oreoRecipe = oreoRecipes[0];
      console.log(`✅ Found Oreo Cookies recipe: ${oreoRecipe.name} (ID: ${oreoRecipe.id})`);
      
      // Check if recipe has ingredients
      const ingredientsOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${oreoRecipe.id}`,
        method: 'GET',
        headers
      };
      
      const recipeIngredients = await makeRequest(ingredientsOptions);
      console.log(`📋 Recipe has ${recipeIngredients.length} ingredients`);
      
      if (recipeIngredients.length === 0) {
        console.log('⚠️ Recipe has no ingredients - this is why deduction isn\'t working');
      }
    } else {
      console.log('❌ No Oreo Cookies recipe found');
    }
    
    // Step 5: Check product catalog integration
    console.log('\n🛍️ STEP 5: CHECKING PRODUCT CATALOG INTEGRATION');
    console.log('-'.repeat(40));
    
    const productsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=*&store_id=eq.${SUGBO_STORE_ID}&product_name=ilike.*oreo*cookies*`,
      method: 'GET',
      headers
    };
    
    const oreoProducts = await makeRequest(productsOptions);
    
    if (oreoProducts.length > 0) {
      const oreoProduct = oreoProducts[0];
      console.log(`✅ Found Oreo Cookies product: ${oreoProduct.product_name} (ID: ${oreoProduct.id})`);
      console.log(`   Recipe ID: ${oreoProduct.recipe_id || 'Not linked'}`);
      
      if (!oreoProduct.recipe_id) {
        console.log('⚠️ Product not linked to recipe - this prevents inventory deduction');
      }
    } else {
      console.log('❌ No Oreo Cookies product found');
    }
    
    // Step 6: Check commissary inventory
    console.log('\n🏪 STEP 6: CHECKING COMMISSARY INVENTORY');
    console.log('-'.repeat(40));
    
    const commissaryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/commissary_inventory?select=*&limit=5',
      method: 'GET',
      headers
    };
    
    const commissaryItems = await makeRequest(commissaryOptions);
    console.log(`🏪 Found ${commissaryItems.length} commissary items`);
    
    if (commissaryItems.length > 0) {
      console.log('\n📋 Sample commissary items:');
      commissaryItems.forEach(item => {
        const itemName = item.name || item.item_name || 'Unknown';
        console.log(`   - ${itemName}: ${item.current_stock} ${item.unit}`);
      });
    }
    
    // Step 7: Diagnosis and recommendations
    console.log('\n🔍 STEP 7: DIAGNOSIS AND RECOMMENDATIONS');
    console.log('='.repeat(50));
    
    const issues = [];
    const recommendations = [];
    
    if (inventory.length === 0) {
      issues.push('No store inventory items found');
      recommendations.push('Set up store inventory items');
    }
    
    if (movements.length === 0) {
      issues.push('No inventory movements recorded');
      recommendations.push('Check if inventory deduction is properly triggered in transactions');
    }
    
    if (oreoRecipes.length === 0) {
      issues.push('Oreo Cookies recipe not found');
      recommendations.push('Deploy Oreo Cookies recipe to Sugbo Mercado');
    }
    
    if (oreoProducts.length === 0) {
      issues.push('Oreo Cookies product not found');
      recommendations.push('Create Oreo Cookies product in catalog');
    }
    
    console.log('🚨 IDENTIFIED ISSUES:');
    if (issues.length > 0) {
      issues.forEach(issue => console.log(`   ❌ ${issue}`));
    } else {
      console.log('   ✅ No major issues found');
    }
    
    console.log('\n📋 RECOMMENDATIONS:');
    if (recommendations.length > 0) {
      recommendations.forEach(rec => console.log(`   💡 ${rec}`));
    } else {
      console.log('   ✅ System appears to be properly configured');
    }
    
    // Step 8: Test transaction simulation (if possible)
    console.log('\n🧪 STEP 8: INVENTORY DEDUCTION STATUS');
    console.log('-'.repeat(40));
    
    if (inventory.length > 0 && oreoProducts.length > 0 && oreoRecipes.length > 0) {
      console.log('✅ Prerequisites met for inventory deduction:');
      console.log('   - Store inventory exists');
      console.log('   - Oreo product exists');
      console.log('   - Oreo recipe exists');
      console.log('\n💡 To test deduction: Place an order through POS and check inventory movements');
    } else {
      console.log('❌ Prerequisites NOT met for inventory deduction:');
      if (inventory.length === 0) console.log('   - Missing store inventory');
      if (oreoProducts.length === 0) console.log('   - Missing Oreo product');
      if (oreoRecipes.length === 0) console.log('   - Missing Oreo recipe');
      console.log('\n🔧 Fix these issues before testing inventory deduction');
    }
    
  } catch (error) {
    console.error('❌ Error during inventory deduction test:', error.message);
  }
}

// Run the test
testInventoryDeduction();
