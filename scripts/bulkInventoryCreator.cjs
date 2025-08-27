#!/usr/bin/env node

/**
 * Bulk Inventory Creator
 * 
 * Creates missing inventory items for recipe ingredients that have no corresponding inventory_stock entries
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

// Default inventory settings for different ingredient types
const inventoryDefaults = {
  // Packaging items
  'cup': { unit: 'pieces', initialStock: 100, minThreshold: 20, cost: 2 },
  'lid': { unit: 'pieces', initialStock: 100, minThreshold: 20, cost: 1 },
  'bag': { unit: 'pieces', initialStock: 50, minThreshold: 10, cost: 3 },
  'box': { unit: 'pieces', initialStock: 50, minThreshold: 10, cost: 5 },
  'straw': { unit: 'pieces', initialStock: 200, minThreshold: 50, cost: 0.5 },
  'stirrer': { unit: 'pieces', initialStock: 200, minThreshold: 50, cost: 0.5 },
  'napkin': { unit: 'pieces', initialStock: 500, minThreshold: 100, cost: 0.2 },
  
  // Ingredients and toppings
  'sauce': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 5 },
  'syrup': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 5 },
  'jam': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 4 },
  'powder': { unit: 'serving', initialStock: 100, minThreshold: 20, cost: 3 },
  'crushed': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 6 },
  'flakes': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 4 },
  'sprinkles': { unit: 'serving', initialStock: 50, minThreshold: 10, cost: 3 },
  'marshmallow': { unit: 'pieces', initialStock: 100, minThreshold: 20, cost: 2 },
  'cookies': { unit: 'pieces', initialStock: 50, minThreshold: 10, cost: 8 },
  
  // Beverages and liquids
  'water': { unit: 'bottles', initialStock: 50, minThreshold: 10, cost: 15 },
  'soda': { unit: 'bottles', initialStock: 30, minThreshold: 5, cost: 18 },
  'juice': { unit: 'bottles', initialStock: 30, minThreshold: 5, cost: 20 },
  'tea': { unit: 'serving', initialStock: 100, minThreshold: 20, cost: 2 },
  'coffee': { unit: 'serving', initialStock: 100, minThreshold: 20, cost: 3 },
  
  // Default for unknown items
  'default': { unit: 'pieces', initialStock: 50, minThreshold: 10, cost: 5 }
};

function determineInventoryDefaults(ingredientName) {
  const name = ingredientName.toLowerCase();
  
  // Check for specific patterns
  for (const [pattern, defaults] of Object.entries(inventoryDefaults)) {
    if (pattern !== 'default' && name.includes(pattern)) {
      return defaults;
    }
  }
  
  // Special cases
  if (name.includes('16oz') || name.includes('cup')) {
    return inventoryDefaults.cup;
  }
  if (name.includes('paper') && name.includes('bag')) {
    return inventoryDefaults.bag;
  }
  if (name.includes('take') && name.includes('box')) {
    return inventoryDefaults.box;
  }
  if (name.includes('coke') || name.includes('sprite')) {
    return inventoryDefaults.soda;
  }
  if (name.includes('bottled') && name.includes('water')) {
    return inventoryDefaults.water;
  }
  
  return inventoryDefaults.default;
}

async function main() {
  console.log('📦 BULK INVENTORY CREATOR');
  console.log('=' .repeat(50));
  
  await auth();
  
  // Get all stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });
  
  let totalCreated = 0;
  let totalSkipped = 0;
  
  for (const store of stores) {
    console.log(`\n🏪 Processing: ${store.name}`);
    console.log('-'.repeat(40));
    
    const result = await createMissingInventoryForStore(store);
    totalCreated += result.created;
    totalSkipped += result.skipped;
    
    console.log(`   ✅ Created: ${result.created} inventory items`);
    console.log(`   ⚠️  Skipped: ${result.skipped} items`);
  }
  
  console.log(`\n📊 BULK CREATION SUMMARY:`);
  console.log(`   Total Created: ${totalCreated} inventory items`);
  console.log(`   Total Skipped: ${totalSkipped} items`);
  console.log(`   Success: ${totalCreated > 0 ? 'Inventory items created successfully' : 'No new items needed'}`);
}

async function createMissingInventoryForStore(store) {
  const result = { created: 0, skipped: 0 };
  
  // Get all recipe ingredients used in this store
  const storeProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,recipe_id&store_id=eq.${store.id}&recipe_id=not.is.null`,
    method: 'GET',
    headers
  });
  
  const recipeIds = [...new Set(storeProducts.map(p => p.recipe_id).filter(Boolean))];
  
  if (recipeIds.length === 0) {
    console.log('   📦 No recipes found');
    return result;
  }
  
  // Get all recipe ingredients
  const recipeIngredients = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_ingredients?select=*&recipe_id=in.(${recipeIds.join(',')})`,
    method: 'GET',
    headers
  });
  
  // Get existing inventory items
  const existingInventory = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=item&store_id=eq.${store.id}`,
    method: 'GET',
    headers
  });
  
  const existingItems = new Set(existingInventory.map(item => item.item.toLowerCase()));
  
  // Find missing ingredients
  const uniqueIngredients = [...new Set(recipeIngredients.map(ing => ing.ingredient_name))];
  const missingIngredients = uniqueIngredients.filter(ingredient => 
    !existingItems.has(ingredient.toLowerCase())
  );
  
  console.log(`   📊 Recipe ingredients: ${uniqueIngredients.length}`);
  console.log(`   📊 Existing inventory: ${existingInventory.length}`);
  console.log(`   📊 Missing ingredients: ${missingIngredients.length}`);
  
  if (missingIngredients.length === 0) {
    console.log('   ✅ All ingredients have inventory items');
    return result;
  }
  
  // Create inventory items for missing ingredients
  const inventoryItemsToCreate = missingIngredients.map(ingredient => {
    const defaults = determineInventoryDefaults(ingredient);
    
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
  
  // Create in batches to avoid overwhelming the database
  const batchSize = 10;
  for (let i = 0; i < inventoryItemsToCreate.length; i += batchSize) {
    const batch = inventoryItemsToCreate.slice(i, i + batchSize);
    
    try {
      await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: '/rest/v1/inventory_stock',
        method: 'POST',
        headers
      }, batch);
      
      result.created += batch.length;
      
      // Show created items
      batch.forEach(item => {
        console.log(`   ✅ Created: ${item.item} (${item.stock_quantity} ${item.unit})`);
      });
      
    } catch (error) {
      console.log(`   ❌ Failed to create batch: ${error.message}`);
      result.skipped += batch.length;
    }
  }
  
  return result;
}

main().catch(err => {
  console.error('Bulk inventory creation failed:', err.message);
  process.exit(1);
});
