#!/usr/bin/env node

/**
 * Check Inventory Deployment Status
 * 
 * This script checks why only 8 inventory items were deployed instead of 61
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

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
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
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

async function main() {
  try {
    console.log('🔍 CHECKING INVENTORY DEPLOYMENT STATUS');
    console.log('='.repeat(50));
    
    // Step 1: Check unique ingredients from recipe templates
    console.log('\n📋 STEP 1: CHECKING RECIPE TEMPLATE INGREDIENTS');
    console.log('-'.repeat(40));
    
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?select=ingredient_name',
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    const uniqueIngredients = [...new Set(ingredients.map(i => i.ingredient_name))];
    
    console.log(`✅ Found ${uniqueIngredients.length} unique ingredients from active recipe templates`);
    console.log('\n📝 Sample ingredients:');
    uniqueIngredients.slice(0, 10).forEach((ingredient, index) => {
      console.log(`   ${index + 1}. ${ingredient}`);
    });
    
    if (uniqueIngredients.length > 10) {
      console.log(`   ... and ${uniqueIngredients.length - 10} more`);
    }
    
    // Step 2: Check active stores
    console.log('\n🏪 STEP 2: CHECKING ACTIVE STORES');
    console.log('-'.repeat(40));
    
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id,name&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    console.log(`✅ Found ${stores.length} active stores`);
    stores.forEach(store => {
      console.log(`   - ${store.name}`);
    });
    
    // Step 3: Check current inventory deployment
    console.log('\n📦 STEP 3: CHECKING CURRENT INVENTORY DEPLOYMENT');
    console.log('-'.repeat(40));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=store_id,item&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    
    // Group by store
    const inventoryByStore = {};
    inventory.forEach(item => {
      const storeId = item.store_id;
      if (!inventoryByStore[storeId]) {
        inventoryByStore[storeId] = [];
      }
      inventoryByStore[storeId].push(item.item);
    });

    console.log(`📊 Current inventory deployment status:`);
    stores.forEach(store => {
      const itemCount = inventoryByStore[store.id] ? inventoryByStore[store.id].length : 0;
      console.log(`   ${store.name}: ${itemCount} items`);
    });
    
    // Step 4: Calculate expected vs actual
    console.log('\n🧮 STEP 4: EXPECTED VS ACTUAL ANALYSIS');
    console.log('-'.repeat(40));
    
    const expectedTotal = uniqueIngredients.length * stores.length;
    const actualTotal = inventory.length;
    
    console.log(`Expected total inventory items: ${uniqueIngredients.length} ingredients × ${stores.length} stores = ${expectedTotal}`);
    console.log(`Actual total inventory items: ${actualTotal}`);
    console.log(`Missing items: ${expectedTotal - actualTotal}`);
    
    if (actualTotal < expectedTotal) {
      console.log('\n❌ DEPLOYMENT INCOMPLETE');
      console.log('Possible reasons:');
      console.log('1. Migration script failed to run completely');
      console.log('2. Some recipe templates are inactive');
      console.log('3. Some stores are inactive');
      console.log('4. Duplicate prevention logic is too strict');
    } else {
      console.log('\n✅ DEPLOYMENT COMPLETE');
    }
    
    // Step 5: Check for missing ingredients per store
    console.log('\n🔍 STEP 5: DETAILED MISSING INGREDIENTS ANALYSIS');
    console.log('-'.repeat(40));
    
    for (const store of stores) {
      const storeInventory = inventory.filter(item => item.store_id === store.id);
      const storeIngredients = storeInventory.map(item => item.item);
      const missingIngredients = uniqueIngredients.filter(ingredient => 
        !storeIngredients.includes(ingredient)
      );
      
      console.log(`\n${store.name}:`);
      console.log(`  Has: ${storeIngredients.length}/${uniqueIngredients.length} ingredients`);
      
      if (missingIngredients.length > 0) {
        console.log(`  Missing ${missingIngredients.length} ingredients:`);
        missingIngredients.slice(0, 5).forEach(ingredient => {
          console.log(`    - ${ingredient}`);
        });
        if (missingIngredients.length > 5) {
          console.log(`    ... and ${missingIngredients.length - 5} more`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
