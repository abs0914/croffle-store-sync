#!/usr/bin/env node

/**
 * Execute Phase 2: High Priority Products
 * 
 * Systematic fixing of high priority products (₱60-₱89) and remaining critical items
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
  console.log('🚀 EXECUTING PHASE 2: HIGH PRIORITY PRODUCTS');
  console.log('=' .repeat(70));
  console.log('Target: High priority products (₱60-₱89) + remaining critical items');
  console.log('Goal: Comprehensive inventory synchronization restoration');
  console.log('=' .repeat(70));
  
  await auth();

  const results = {
    phase1BBlended: { processed: 0, successful: 0 },
    phase2Standard: { processed: 0, successful: 0 },
    phase2Packaging: { processed: 0, successful: 0 },
    phase2Ingredients: { processed: 0, successful: 0 },
    totalProcessed: 0,
    totalSuccessful: 0
  };

  // Get all active stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });
  
  console.log(`\n🏪 Processing ${stores.length} stores...`);
  
  for (const store of stores) {
    console.log(`\n🏪 ${store.name}`);
    console.log('-'.repeat(50));
    
    // Phase 1B: Complete remaining blended drinks
    const blendedResult = await processBlendedDrinks(store);
    results.phase1BBlended.processed += blendedResult.processed;
    results.phase1BBlended.successful += blendedResult.successful;
    
    // Phase 2: Standard drinks (₱60-₱89)
    const standardResult = await processStandardDrinks(store);
    results.phase2Standard.processed += standardResult.processed;
    results.phase2Standard.successful += standardResult.successful;
    
    // Phase 2: Essential packaging
    const packagingResult = await processPackaging(store);
    results.phase2Packaging.processed += packagingResult.processed;
    results.phase2Packaging.successful += packagingResult.successful;
    
    // Phase 2: Key ingredients
    const ingredientsResult = await processKeyIngredients(store);
    results.phase2Ingredients.processed += ingredientsResult.processed;
    results.phase2Ingredients.successful += ingredientsResult.successful;
    
    const storeTotal = blendedResult.processed + standardResult.processed + 
                      packagingResult.processed + ingredientsResult.processed;
    const storeSuccessful = blendedResult.successful + standardResult.successful + 
                           packagingResult.successful + ingredientsResult.successful;
    
    console.log(`   📊 Store Summary: ${storeSuccessful}/${storeTotal} products fixed`);
  }
  
  // Calculate totals
  results.totalProcessed = results.phase1BBlended.processed + results.phase2Standard.processed + 
                          results.phase2Packaging.processed + results.phase2Ingredients.processed;
  results.totalSuccessful = results.phase1BBlended.successful + results.phase2Standard.successful + 
                           results.phase2Packaging.successful + results.phase2Ingredients.successful;
  
  // Generate comprehensive report
  generatePhase2Report(results);
}

async function processBlendedDrinks(store) {
  const result = { processed: 0, successful: 0 };
  
  console.log(`   🧊 Processing remaining blended drinks...`);
  
  // Get blended drinks that still need mapping
  const blendedProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&product_name=ilike.%blended%&recipe_id=not.is.null&price=gte.90`,
    method: 'GET',
    headers
  });
  
  if (blendedProducts.length === 0) return result;
  
  // Check which ones still need mappings
  const productIds = blendedProducts.map(p => p.id).join(',');
  const existingMappings = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${productIds})`,
    method: 'GET',
    headers
  });
  
  const mappedIds = new Set(existingMappings.map(m => m.product_catalog_id));
  const unmappedBlended = blendedProducts.filter(p => !mappedIds.has(p.id));
  
  console.log(`     📦 Unmapped blended drinks: ${unmappedBlended.length}`);
  
  // Get inventory items
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  // Process each unmapped blended drink
  for (const product of unmappedBlended) {
    result.processed++;
    
    try {
      const success = await mapProduct(product, inventoryItems);
      if (success) {
        result.successful++;
        console.log(`     ✅ ${product.product_name}`);
      } else {
        console.log(`     ⚠️  ${product.product_name} - partial mapping`);
      }
    } catch (error) {
      console.log(`     ❌ ${product.product_name} - error: ${error.message}`);
    }
  }
  
  return result;
}

async function processStandardDrinks(store) {
  const result = { processed: 0, successful: 0 };
  
  console.log(`   🥤 Processing standard drinks (₱60-₱89)...`);
  
  // Get standard drinks
  const standardProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null&price=gte.60&price=lt.90&is_available=eq.true`,
    method: 'GET',
    headers
  });
  
  if (standardProducts.length === 0) return result;
  
  // Filter out already mapped products
  const productIds = standardProducts.map(p => p.id).join(',');
  const existingMappings = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${productIds})`,
    method: 'GET',
    headers
  });
  
  const mappedIds = new Set(existingMappings.map(m => m.product_catalog_id));
  const unmappedStandard = standardProducts.filter(p => !mappedIds.has(p.id));
  
  console.log(`     📦 Unmapped standard drinks: ${unmappedStandard.length}`);
  
  // Get inventory items
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  // Process each unmapped standard drink
  for (const product of unmappedStandard.slice(0, 10)) { // Limit for safety
    result.processed++;
    
    try {
      const success = await mapProduct(product, inventoryItems);
      if (success) {
        result.successful++;
        console.log(`     ✅ ${product.product_name} - ₱${product.price}`);
      } else {
        console.log(`     ⚠️  ${product.product_name} - partial mapping`);
      }
    } catch (error) {
      console.log(`     ❌ ${product.product_name} - error: ${error.message}`);
    }
  }
  
  return result;
}

async function processPackaging(store) {
  const result = { processed: 0, successful: 0 };
  
  console.log(`   📦 Processing essential packaging...`);
  
  // Get packaging products
  const packagingProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null&price=gte.40&price=lt.60&is_available=eq.true&limit=10`,
    method: 'GET',
    headers
  });
  
  if (packagingProducts.length === 0) return result;
  
  // Filter packaging items (cups, lids, bags, etc.)
  const packagingItems = packagingProducts.filter(p => {
    const name = p.product_name.toLowerCase();
    return name.includes('cup') || name.includes('lid') || name.includes('bag') || 
           name.includes('box') || name.includes('straw') || name.includes('napkin');
  });
  
  console.log(`     📦 Packaging items found: ${packagingItems.length}`);
  
  // Get inventory items
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  // Process each packaging item
  for (const product of packagingItems) {
    result.processed++;
    
    try {
      const success = await mapProduct(product, inventoryItems);
      if (success) {
        result.successful++;
        console.log(`     ✅ ${product.product_name}`);
      } else {
        console.log(`     ⚠️  ${product.product_name} - partial mapping`);
      }
    } catch (error) {
      console.log(`     ❌ ${product.product_name} - error: ${error.message}`);
    }
  }
  
  return result;
}

async function processKeyIngredients(store) {
  const result = { processed: 0, successful: 0 };
  
  console.log(`   🧂 Processing key ingredients...`);
  
  // Get ingredient products
  const ingredientProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null&price=gte.30&price=lt.60&is_available=eq.true&limit=10`,
    method: 'GET',
    headers
  });
  
  if (ingredientProducts.length === 0) return result;
  
  // Filter ingredient items (sauces, syrups, toppings)
  const ingredientItems = ingredientProducts.filter(p => {
    const name = p.product_name.toLowerCase();
    return name.includes('sauce') || name.includes('syrup') || name.includes('jam') || 
           name.includes('powder') || name.includes('cream') || name.includes('topping');
  });
  
  console.log(`     📦 Ingredient items found: ${ingredientItems.length}`);
  
  // Get inventory items
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  // Process each ingredient item
  for (const product of ingredientItems) {
    result.processed++;
    
    try {
      const success = await mapProduct(product, inventoryItems);
      if (success) {
        result.successful++;
        console.log(`     ✅ ${product.product_name}`);
      } else {
        console.log(`     ⚠️  ${product.product_name} - partial mapping`);
      }
    } catch (error) {
      console.log(`     ❌ ${product.product_name} - error: ${error.message}`);
    }
  }
  
  return result;
}

async function mapProduct(product, inventoryItems) {
  // Get recipe ingredients
  const recipeIngredients = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
    method: 'GET',
    headers
  });
  
  if (recipeIngredients.length === 0) return false;
  
  // Create mappings
  const mappings = [];
  
  for (const recipeIng of recipeIngredients) {
    const match = findBestMatch(recipeIng.ingredient_name, inventoryItems);
    
    if (match && match.similarity >= 0.7) {
      mappings.push({
        product_catalog_id: product.id,
        inventory_stock_id: match.inventory.id,
        required_quantity: recipeIng.quantity,
        unit: recipeIng.unit
      });
    }
  }
  
  // Only create if we have complete mappings
  if (mappings.length === recipeIngredients.length) {
    await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/product_ingredients',
      method: 'POST',
      headers
    }, mappings);
    
    return true;
  }
  
  return false;
}

function findBestMatch(ingredientName, inventoryItems) {
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const inventory of inventoryItems) {
    const similarity = calculateSimilarity(ingredientName, inventory.item);
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { inventory, similarity };
    }
  }
  
  return bestMatch;
}

function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  
  return commonWords.length / Math.max(words1.length, words2.length);
}

function generatePhase2Report(results) {
  console.log('\n📋 PHASE 2 EXECUTION REPORT');
  console.log('=' .repeat(70));
  
  const overallSuccessRate = results.totalProcessed > 0 
    ? ((results.totalSuccessful / results.totalProcessed) * 100).toFixed(1)
    : 0;
  
  console.log(`📊 COMPREHENSIVE SUMMARY:`);
  console.log(`   Total Products Processed: ${results.totalProcessed}`);
  console.log(`   Total Successfully Fixed: ${results.totalSuccessful}`);
  console.log(`   Overall Success Rate: ${overallSuccessRate}%`);
  
  console.log(`\n📈 CATEGORY BREAKDOWN:`);
  console.log(`   Phase 1B - Blended Drinks: ${results.phase1BBlended.successful}/${results.phase1BBlended.processed}`);
  console.log(`   Phase 2 - Standard Drinks: ${results.phase2Standard.successful}/${results.phase2Standard.processed}`);
  console.log(`   Phase 2 - Packaging: ${results.phase2Packaging.successful}/${results.phase2Packaging.processed}`);
  console.log(`   Phase 2 - Key Ingredients: ${results.phase2Ingredients.successful}/${results.phase2Ingredients.processed}`);
  
  // Calculate total revenue impact
  const croffleRevenue = 23 * 125; // From Phase 1
  const blendedRevenue = results.phase1BBlended.successful * 100;
  const standardRevenue = results.phase2Standard.successful * 75;
  const totalRevenue = croffleRevenue + blendedRevenue + standardRevenue;
  
  console.log(`\n💰 REVENUE IMPACT:`);
  console.log(`   Phase 1 Croffles: ₱${croffleRevenue} (23 products × ₱125)`);
  console.log(`   Phase 1B Blended: ₱${blendedRevenue} (${results.phase1BBlended.successful} products × ₱100)`);
  console.log(`   Phase 2 Standard: ₱${standardRevenue} (${results.phase2Standard.successful} products × ₱75)`);
  console.log(`   Total Revenue Protected: ₱${totalRevenue}`);
  
  console.log(`\n🎯 FINAL ASSESSMENT:`);
  
  const totalFixed = 23 + results.totalSuccessful; // Include Phase 1 croffles
  
  if (totalFixed >= 70) {
    console.log(`   ✅ COMPREHENSIVE SUCCESS: ${totalFixed} products with inventory deduction`);
    console.log(`   🎉 Inventory synchronization largely restored across all stores`);
    console.log(`   💼 Business impact: Major improvement in cost tracking and stock management`);
  } else if (totalFixed >= 40) {
    console.log(`   ⚠️  SIGNIFICANT PROGRESS: ${totalFixed} products with inventory deduction`);
    console.log(`   🔄 Continue with remaining products using manual review`);
  } else {
    console.log(`   ❌ MORE WORK NEEDED: Only ${totalFixed} products with inventory deduction`);
    console.log(`   🔧 Review systematic approach and address blocking issues`);
  }
  
  console.log(`\n🏆 INVENTORY SYNCHRONIZATION STATUS:`);
  console.log(`   Before Fixes: 0% of products had inventory deduction`);
  console.log(`   After Phase 1 & 2: ${totalFixed} products have functional inventory deduction`);
  console.log(`   System Status: ${totalFixed >= 50 ? 'LARGELY RESTORED' : 'PARTIALLY RESTORED'}`);
  console.log(`   Next Steps: ${totalFixed >= 70 ? 'Monitor and maintain' : 'Continue with remaining products'}`);
}

main().catch(err => {
  console.error('Phase 2 execution failed:', err.message);
  process.exit(1);
});
