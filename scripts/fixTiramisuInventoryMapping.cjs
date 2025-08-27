#!/usr/bin/env node

/**
 * Fix Tiramisu Croffle Inventory Mapping
 * 
 * Creates the missing ingredient mappings for Tiramisu Croffle to enable inventory deduction
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const TIRAMISU_PRODUCT_ID = '0387e76b-b536-4c2f-a831-ebe44d9b98fa';
const STORE_ID = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function req(options, data) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${json?.message || body}`));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function auth() {
  const authRes = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers.Authorization = `Bearer ${authRes.access_token}`;
}

async function main() {
  console.log('🔧 TIRAMISU CROFFLE INVENTORY MAPPING FIX');
  console.log('=' .repeat(60));
  
  await auth();

  // Step 1: Get available inventory items for this store
  console.log('\n📦 STEP 1: Available Inventory Items');
  console.log('-'.repeat(40));
  
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${STORE_ID}&is_active=eq.true&order=item.asc`,
    method: 'GET',
    headers
  });
  
  console.log(`Found ${inventoryItems.length} active inventory items:`);
  inventoryItems.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.item} - ${item.stock_quantity} ${item.unit}`);
  });
  
  // Step 2: Check if Tiramisu recipe exists and get ingredients
  console.log('\n🧪 STEP 2: Recipe Analysis');
  console.log('-'.repeat(40));
  
  const product = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&id=eq.${TIRAMISU_PRODUCT_ID}`,
    method: 'GET',
    headers
  });
  
  if (product.length === 0) {
    console.log('❌ Tiramisu Croffle product not found');
    return;
  }
  
  const tiramisuProduct = product[0];
  console.log(`✅ Product: ${tiramisuProduct.product_name}`);
  console.log(`   Recipe ID: ${tiramisuProduct.recipe_id || 'None'}`);
  
  if (tiramisuProduct.recipe_id) {
    // Get recipe ingredients
    const recipeIngredients = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${tiramisuProduct.recipe_id}`,
      method: 'GET',
      headers
    });
    
    console.log(`\n📋 Recipe Ingredients (${recipeIngredients.length}):`);
    recipeIngredients.forEach((ing, i) => {
      console.log(`   ${i + 1}. ${ing.ingredient_name} - ${ing.quantity} ${ing.unit}`);
    });
    
    if (recipeIngredients.length > 0) {
      await createIngredientMappings(recipeIngredients, inventoryItems);
    }
  } else {
    console.log('⚠️  No recipe found - will create basic ingredient mappings');
    await createBasicIngredientMappings(inventoryItems);
  }
}

async function createIngredientMappings(recipeIngredients, inventoryItems) {
  console.log('\n🔗 STEP 3: Creating Ingredient Mappings');
  console.log('-'.repeat(40));
  
  const mappingsToCreate = [];
  
  for (const recipeIng of recipeIngredients) {
    // Find matching inventory item
    const matchingInventory = inventoryItems.find(inv => 
      inv.item.toLowerCase().includes(recipeIng.ingredient_name.toLowerCase()) ||
      recipeIng.ingredient_name.toLowerCase().includes(inv.item.toLowerCase())
    );
    
    if (matchingInventory) {
      mappingsToCreate.push({
        product_catalog_id: TIRAMISU_PRODUCT_ID,
        inventory_stock_id: matchingInventory.id,
        required_quantity: recipeIng.quantity,
        unit: recipeIng.unit
      });
      
      console.log(`✅ Mapping: ${recipeIng.ingredient_name} → ${matchingInventory.item}`);
    } else {
      console.log(`❌ No inventory match for: ${recipeIng.ingredient_name}`);
    }
  }
  
  if (mappingsToCreate.length > 0) {
    await insertMappings(mappingsToCreate);
  } else {
    console.log('⚠️  No mappings could be created - manual intervention needed');
  }
}

async function createBasicIngredientMappings(inventoryItems) {
  console.log('\n🔗 STEP 3: Creating Basic Ingredient Mappings');
  console.log('-'.repeat(40));
  
  // Create basic mappings for common Tiramisu ingredients
  const basicIngredients = [
    { name: 'Regular Croissant', quantity: 1, unit: 'pieces' },
    { name: 'Whipped Cream', quantity: 1, unit: 'Serving' },
    { name: 'Chopstick', quantity: 1, unit: 'pieces' },
    { name: 'Wax Paper', quantity: 1, unit: 'pieces' }
  ];
  
  const mappingsToCreate = [];
  
  for (const ingredient of basicIngredients) {
    const matchingInventory = inventoryItems.find(inv => 
      inv.item.toLowerCase().includes(ingredient.name.toLowerCase()) ||
      ingredient.name.toLowerCase().includes(inv.item.toLowerCase())
    );
    
    if (matchingInventory) {
      mappingsToCreate.push({
        product_catalog_id: TIRAMISU_PRODUCT_ID,
        inventory_stock_id: matchingInventory.id,
        required_quantity: ingredient.quantity,
        unit: ingredient.unit
      });
      
      console.log(`✅ Basic Mapping: ${ingredient.name} → ${matchingInventory.item}`);
    } else {
      console.log(`❌ No inventory match for: ${ingredient.name}`);
    }
  }
  
  if (mappingsToCreate.length > 0) {
    await insertMappings(mappingsToCreate);
  } else {
    console.log('⚠️  No basic mappings could be created');
  }
}

async function insertMappings(mappings) {
  console.log(`\n💾 STEP 4: Inserting ${mappings.length} Ingredient Mappings`);
  console.log('-'.repeat(40));
  
  try {
    const result = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/product_ingredients',
      method: 'POST',
      headers
    }, mappings);
    
    console.log(`✅ Successfully created ${mappings.length} ingredient mappings`);
    
    // Verify the mappings were created
    const verification = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(item,stock_quantity,unit)&product_catalog_id=eq.${TIRAMISU_PRODUCT_ID}`,
      method: 'GET',
      headers
    });
    
    console.log(`\n✅ VERIFICATION: ${verification.length} mappings now exist for Tiramisu Croffle:`);
    verification.forEach((mapping, i) => {
      const item = mapping.inventory_item;
      console.log(`   ${i + 1}. ${item.item} - Need: ${mapping.required_quantity} ${mapping.unit}, Have: ${item.stock_quantity} ${item.unit}`);
    });
    
    console.log(`\n🎯 SOLUTION SUMMARY:`);
    console.log(`   ✅ Ingredient mappings created for Tiramisu Croffle`);
    console.log(`   ✅ Future transactions will now trigger inventory deduction`);
    console.log(`   ✅ The inventory sync system should work properly`);
    
    console.log(`\n📋 NEXT STEPS:`);
    console.log(`   1. Test a new Tiramisu Croffle transaction`);
    console.log(`   2. Verify inventory deduction occurs`);
    console.log(`   3. Check inventory sync logs for success`);
    
  } catch (error) {
    console.error(`❌ Failed to create mappings: ${error.message}`);
  }
}

main().catch(err => {
  console.error('Fix script failed:', err.message);
  process.exit(1);
});
