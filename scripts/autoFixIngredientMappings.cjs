#!/usr/bin/env node

/**
 * Auto-Fix Ingredient Mappings
 * 
 * Automatically creates ingredient mappings for products with perfect inventory matches
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

async function main() {
  console.log('🔧 AUTO-FIX INGREDIENT MAPPINGS');
  console.log('=' .repeat(60));
  console.log('Creating ingredient mappings for products with perfect matches...');
  
  await auth();

  // Get all active stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });
  
  console.log(`\n📊 Processing ${stores.length} active stores`);
  
  let totalFixed = 0;
  let totalErrors = 0;
  
  for (const store of stores) {
    console.log(`\n🏪 Processing: ${store.name}`);
    console.log('-'.repeat(40));
    
    const result = await processStore(store);
    totalFixed += result.fixed;
    totalErrors += result.errors;
    
    console.log(`   ✅ Fixed: ${result.fixed} products`);
    console.log(`   ❌ Errors: ${result.errors} products`);
  }
  
  console.log(`\n📋 AUTO-FIX SUMMARY:`);
  console.log(`   Total Products Fixed: ${totalFixed}`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Success Rate: ${totalFixed > 0 ? ((totalFixed / (totalFixed + totalErrors)) * 100).toFixed(1) : 0}%`);
  
  if (totalFixed > 0) {
    console.log(`\n✅ SUCCESS: ${totalFixed} products now have ingredient mappings!`);
    console.log(`   Inventory deduction should now work for these products.`);
    console.log(`   Test by processing a transaction and checking inventory levels.`);
  }
  
  if (totalErrors > 0) {
    console.log(`\n⚠️  ${totalErrors} products could not be auto-fixed and require manual review.`);
  }
}

async function processStore(store) {
  const result = { fixed: 0, errors: 0 };
  
  // Get products with recipes but no mappings
  const products = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null`,
    method: 'GET',
    headers
  });
  
  // Get existing mappings to avoid duplicates
  const existingMappings = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${products.map(p => p.id).join(',')})`,
    method: 'GET',
    headers
  });
  
  const mappedProductIds = new Set(existingMappings.map(m => m.product_catalog_id));
  const unmappedProducts = products.filter(p => !mappedProductIds.has(p.id));
  
  console.log(`   📦 Products: ${products.length} with recipes, ${unmappedProducts.length} unmapped`);
  
  if (unmappedProducts.length === 0) {
    console.log(`   ✅ All products already have mappings`);
    return result;
  }
  
  // Get inventory items for this store
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Inventory Items: ${inventoryItems.length} available`);
  
  // Process each unmapped product
  for (const product of unmappedProducts.slice(0, 10)) { // Limit to 10 per store for safety
    try {
      const fixed = await processProduct(product, inventoryItems);
      if (fixed) {
        result.fixed++;
        console.log(`   ✅ ${product.product_name}`);
      } else {
        result.errors++;
        console.log(`   ❌ ${product.product_name} - no perfect matches`);
      }
    } catch (error) {
      result.errors++;
      console.log(`   ❌ ${product.product_name} - error: ${error.message}`);
    }
  }
  
  return result;
}

async function processProduct(product, inventoryItems) {
  // Get recipe ingredients
  const recipeIngredients = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
    method: 'GET',
    headers
  });
  
  if (recipeIngredients.length === 0) {
    return false; // No recipe ingredients
  }
  
  const mappingsToCreate = [];
  
  // Check if all ingredients have perfect matches
  for (const recipeIng of recipeIngredients) {
    const matches = inventoryItems.filter(inv => 
      inv.item.toLowerCase() === recipeIng.ingredient_name.toLowerCase() ||
      (inv.item.toLowerCase().includes(recipeIng.ingredient_name.toLowerCase()) && 
       recipeIng.ingredient_name.toLowerCase().includes(inv.item.toLowerCase()))
    );
    
    if (matches.length === 1) {
      // Perfect match found
      mappingsToCreate.push({
        product_catalog_id: product.id,
        inventory_stock_id: matches[0].id,
        required_quantity: recipeIng.quantity,
        unit: recipeIng.unit
      });
    } else {
      // No perfect match or multiple matches - skip this product
      return false;
    }
  }
  
  // All ingredients have perfect matches - create mappings
  if (mappingsToCreate.length === recipeIngredients.length && mappingsToCreate.length > 0) {
    await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/product_ingredients',
      method: 'POST',
      headers
    }, mappingsToCreate);
    
    return true;
  }
  
  return false;
}

main().catch(err => {
  console.error('Auto-fix failed:', err.message);
  process.exit(1);
});
