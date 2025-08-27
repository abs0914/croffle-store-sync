#!/usr/bin/env node

/**
 * Fix Blended Drinks Phase 1
 * 
 * Creates missing inventory items for blended drinks and completes their mappings
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

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

// Inventory defaults for blended drink ingredients
const blendedDrinkDefaults = {
  'Oreo Cookies': { unit: 'pieces', initialStock: 100, minThreshold: 20, cost: 8 },
  'Strawberry Syrup': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 6 },
  'Strawberry Jam': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 7 },
  'Matcha Powder': { unit: 'serving', initialStock: 100, minThreshold: 20, cost: 10 },
  'Milk': { unit: 'serving', initialStock: 100, minThreshold: 20, cost: 3 },
  'Ice': { unit: 'serving', initialStock: 200, minThreshold: 50, cost: 1 },
  'Blender Cup': { unit: 'pieces', initialStock: 50, minThreshold: 10, cost: 15 },
  'Whipped Cream Topping': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 4 }
};

async function main() {
  console.log('🔧 FIXING BLENDED DRINKS - PHASE 1');
  console.log('=' .repeat(60));
  
  await auth();

  // Get all stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });
  
  let totalFixed = 0;
  let totalInventoryCreated = 0;
  
  for (const store of stores) {
    console.log(`\n🏪 Processing: ${store.name}`);
    console.log('-'.repeat(40));
    
    const result = await fixBlendedDrinksForStore(store);
    totalFixed += result.fixed;
    totalInventoryCreated += result.inventoryCreated;
    
    console.log(`   ✅ Fixed: ${result.fixed} blended drinks`);
    console.log(`   📦 Created: ${result.inventoryCreated} inventory items`);
  }
  
  console.log(`\n📊 BLENDED DRINKS FIX SUMMARY:`);
  console.log(`   Total Blended Drinks Fixed: ${totalFixed}`);
  console.log(`   Total Inventory Items Created: ${totalInventoryCreated}`);
  
  if (totalFixed > 0) {
    console.log(`\n✅ SUCCESS: Blended drinks now have complete ingredient mappings!`);
    console.log(`   Inventory deduction should now work for blended drinks.`);
  }
}

async function fixBlendedDrinksForStore(store) {
  const result = { fixed: 0, inventoryCreated: 0 };
  
  // Get blended drink products
  const blendedProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&product_name=ilike.%blended%&recipe_id=not.is.null`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Blended drinks found: ${blendedProducts.length}`);
  
  if (blendedProducts.length === 0) return result;
  
  // Get existing inventory items
  const existingInventory = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  const existingItems = new Set(existingInventory.map(item => item.item));
  
  // Process each blended drink
  for (const product of blendedProducts) {
    try {
      // Get recipe ingredients
      const recipeIngredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
        method: 'GET',
        headers
      });
      
      console.log(`\n   🔄 Processing: ${product.product_name}`);
      console.log(`      Recipe ingredients: ${recipeIngredients.length}`);
      
      // Check which ingredients need inventory items
      const missingIngredients = [];
      
      for (const recipeIng of recipeIngredients) {
        if (!existingItems.has(recipeIng.ingredient_name)) {
          missingIngredients.push(recipeIng.ingredient_name);
        }
      }
      
      console.log(`      Missing inventory items: ${missingIngredients.length}`);
      
      // Create missing inventory items
      if (missingIngredients.length > 0) {
        const inventoryItemsToCreate = missingIngredients.map(ingredient => {
          const defaults = getIngredientDefaults(ingredient);
          
          return {
            store_id: store.id,
            item: ingredient,
            unit: defaults.unit,
            stock_quantity: defaults.initialStock,
            minimum_threshold: defaults.minThreshold,
            cost_per_unit: defaults.cost,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });
        
        // Create inventory items
        await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: '/rest/v1/inventory_stock',
          method: 'POST',
          headers
        }, inventoryItemsToCreate);
        
        result.inventoryCreated += inventoryItemsToCreate.length;
        console.log(`      ✅ Created ${inventoryItemsToCreate.length} inventory items`);
        
        // Update existing items set
        inventoryItemsToCreate.forEach(item => existingItems.add(item.item));
      }
      
      // Now create complete mappings
      const updatedInventory = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
        method: 'GET',
        headers
      });
      
      const mappings = [];
      
      for (const recipeIng of recipeIngredients) {
        const inventoryItem = updatedInventory.find(inv => inv.item === recipeIng.ingredient_name);
        
        if (inventoryItem) {
          mappings.push({
            product_catalog_id: product.id,
            inventory_stock_id: inventoryItem.id,
            required_quantity: recipeIng.quantity,
            unit: recipeIng.unit
          });
        }
      }
      
      if (mappings.length === recipeIngredients.length) {
        // Delete existing mappings first (in case of partial mappings)
        try {
          await req({
            hostname: SUPABASE_URL,
            port: 443,
            path: `/rest/v1/product_ingredients?product_catalog_id=eq.${product.id}`,
            method: 'DELETE',
            headers
          });
        } catch (error) {
          // Ignore if no existing mappings
        }
        
        // Create complete mappings
        await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: '/rest/v1/product_ingredients',
          method: 'POST',
          headers
        }, mappings);
        
        result.fixed++;
        console.log(`      ✅ Created ${mappings.length} complete mappings`);
      } else {
        console.log(`      ❌ Could not create complete mappings: ${mappings.length}/${recipeIngredients.length}`);
      }
      
    } catch (error) {
      console.log(`      ❌ Error processing ${product.product_name}: ${error.message}`);
    }
  }
  
  return result;
}

function getIngredientDefaults(ingredientName) {
  const name = ingredientName.toLowerCase();
  
  // Check for specific matches
  for (const [pattern, defaults] of Object.entries(blendedDrinkDefaults)) {
    if (name.includes(pattern.toLowerCase())) {
      return defaults;
    }
  }
  
  // Default for unknown ingredients
  return { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 5 };
}

main().catch(err => {
  console.error('Blended drinks fix failed:', err.message);
  process.exit(1);
});
