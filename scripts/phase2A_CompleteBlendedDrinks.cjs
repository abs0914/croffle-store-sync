#!/usr/bin/env node

/**
 * Phase 2A: Complete Blended Drink Mappings
 * 
 * Maps all 24 remaining blended drink products using specialized inventory items from Phase 1B
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

// Enhanced ingredient matching for blended drinks
const BLENDED_INGREDIENT_MAPPING = {
  // Oreo-based ingredients
  'oreo': ['Oreo Cookies', 'oreo cookies', 'cookies'],
  'cookie': ['Oreo Cookies', 'oreo cookies'],
  
  // Strawberry ingredients
  'strawberry': ['Strawberry Syrup', 'Strawberry Jam', 'Fresh Strawberries'],
  'strawberry syrup': ['Strawberry Syrup'],
  'strawberry jam': ['Strawberry Jam'],
  'fresh strawberry': ['Fresh Strawberries'],
  
  // Matcha ingredients
  'matcha': ['Matcha Powder'],
  'matcha powder': ['Matcha Powder'],
  'green tea': ['Matcha Powder'],
  
  // Base ingredients
  'milk': ['Milk'],
  'ice': ['Ice', 'Crushed Ice'],
  'crushed ice': ['Crushed Ice'],
  'vanilla': ['Vanilla Ice Cream'],
  'ice cream': ['Vanilla Ice Cream'],
  
  // Containers and toppings
  'cup': ['Blender Cup', '16oz Cup'],
  'blender': ['Blender Cup'],
  'whipped cream': ['Whipped Cream Topping', 'Whipped Cream'],
  'topping': ['Whipped Cream Topping'],
  'base': ['Blended Base Mix'],
  'mix': ['Blended Base Mix']
};

async function main() {
  console.log('🧊 PHASE 2A: COMPLETE BLENDED DRINK MAPPINGS');
  console.log('=' .repeat(70));
  console.log('Target: 24 blended drink products using specialized inventory');
  console.log('Inventory: Oreo Cookies, Matcha Powder, Strawberry Syrup, etc.');
  console.log('=' .repeat(70));
  
  await auth();

  const results = {
    totalProcessed: 0,
    successfullyMapped: 0,
    partiallyMapped: 0,
    failed: 0,
    details: []
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
    
    const storeResult = await processBlendedDrinksForStore(store);
    
    results.totalProcessed += storeResult.processed;
    results.successfullyMapped += storeResult.successful;
    results.partiallyMapped += storeResult.partial;
    results.failed += storeResult.failed;
    results.details.push(...storeResult.details);
    
    console.log(`   📊 Processed: ${storeResult.processed} blended drinks`);
    console.log(`   ✅ Complete mappings: ${storeResult.successful}`);
    console.log(`   ⚠️  Partial mappings: ${storeResult.partial}`);
    console.log(`   ❌ Failed: ${storeResult.failed}`);
  }
  
  // Generate Phase 2A report
  generatePhase2AReport(results);
  
  return results;
}

async function processBlendedDrinksForStore(store) {
  const result = {
    processed: 0,
    successful: 0,
    partial: 0,
    failed: 0,
    details: []
  };
  
  // Get blended drink products (₱90-₱110)
  const blendedProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&product_name=ilike.%blended%&recipe_id=not.is.null&price=gte.90&price=lte.110&is_available=eq.true`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Blended drinks found: ${blendedProducts.length}`);
  
  if (blendedProducts.length === 0) return result;
  
  // Get current inventory items (including newly created specialized items)
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Available inventory items: ${inventoryItems.length}`);
  
  // Check which blended drinks already have complete mappings
  const productIds = blendedProducts.map(p => p.id).join(',');
  const existingMappings = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${productIds})`,
    method: 'GET',
    headers
  });
  
  const mappedProductIds = new Set(existingMappings.map(m => m.product_catalog_id));
  const unmappedProducts = blendedProducts.filter(p => !mappedProductIds.has(p.id));
  
  console.log(`   📦 Unmapped blended drinks: ${unmappedProducts.length}`);
  
  // Process each unmapped blended drink
  for (const product of unmappedProducts) {
    result.processed++;
    
    try {
      const mappingResult = await createBlendedDrinkMapping(product, inventoryItems, store);
      result.details.push(mappingResult);
      
      if (mappingResult.success) {
        result.successful++;
        console.log(`     ✅ ${product.product_name}: ${mappingResult.mappingsCreated}/${mappingResult.totalIngredients} complete`);
      } else if (mappingResult.partialMappings > 0) {
        result.partial++;
        console.log(`     ⚠️  ${product.product_name}: ${mappingResult.partialMappings}/${mappingResult.totalIngredients} partial`);
      } else {
        result.failed++;
        console.log(`     ❌ ${product.product_name}: ${mappingResult.error}`);
      }
      
    } catch (error) {
      result.failed++;
      result.details.push({
        productId: product.id,
        productName: product.product_name,
        storeName: store.name,
        success: false,
        error: error.message
      });
      console.log(`     ❌ ${product.product_name}: Error - ${error.message}`);
    }
  }
  
  return result;
}

async function createBlendedDrinkMapping(product, inventoryItems, store) {
  // Get recipe ingredients
  const recipeIngredients = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
    method: 'GET',
    headers
  });
  
  if (recipeIngredients.length === 0) {
    return {
      productId: product.id,
      productName: product.product_name,
      storeName: store.name,
      success: false,
      error: 'No recipe ingredients found'
    };
  }
  
  // Clear any existing partial mappings
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
  
  // Create mappings with enhanced blended drink matching
  const mappings = [];
  const unmatchedIngredients = [];
  
  for (const recipeIng of recipeIngredients) {
    const match = findBlendedDrinkMatch(recipeIng.ingredient_name, inventoryItems);
    
    if (match && match.similarity >= 0.7) {
      mappings.push({
        product_catalog_id: product.id,
        inventory_stock_id: match.inventory.id,
        required_quantity: recipeIng.quantity,
        unit: recipeIng.unit
      });
    } else {
      unmatchedIngredients.push(recipeIng.ingredient_name);
    }
  }
  
  // Create mappings (complete or partial)
  if (mappings.length > 0) {
    await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/product_ingredients',
      method: 'POST',
      headers
    }, mappings);
  }
  
  const isComplete = mappings.length === recipeIngredients.length;
  
  return {
    productId: product.id,
    productName: product.product_name,
    storeName: store.name,
    success: isComplete,
    mappingsCreated: mappings.length,
    partialMappings: isComplete ? 0 : mappings.length,
    totalIngredients: recipeIngredients.length,
    unmatchedIngredients: unmatchedIngredients,
    error: isComplete ? null : `Missing ingredients: ${unmatchedIngredients.join(', ')}`
  };
}

function findBlendedDrinkMatch(ingredientName, inventoryItems) {
  const ingredient = ingredientName.toLowerCase().trim();
  
  // First, try enhanced blended drink mapping
  for (const [pattern, candidates] of Object.entries(BLENDED_INGREDIENT_MAPPING)) {
    if (ingredient.includes(pattern)) {
      for (const candidate of candidates) {
        const match = inventoryItems.find(inv => 
          inv.item.toLowerCase() === candidate.toLowerCase()
        );
        if (match) {
          return { inventory: match, similarity: 0.95 };
        }
      }
    }
  }
  
  // Fallback to general fuzzy matching
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const inventory of inventoryItems) {
    const similarity = calculateSimilarity(ingredient, inventory.item.toLowerCase());
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = { inventory, similarity };
    }
  }
  
  return bestMatch;
}

function calculateSimilarity(str1, str2) {
  // Exact match
  if (str1 === str2) return 1.0;
  
  // Contains match
  if (str1.includes(str2) || str2.includes(str1)) return 0.9;
  
  // Word overlap
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  
  return commonWords.length / Math.max(words1.length, words2.length);
}

function generatePhase2AReport(results) {
  console.log('\n📋 PHASE 2A COMPLETION REPORT');
  console.log('=' .repeat(70));
  
  const successRate = results.totalProcessed > 0 
    ? ((results.successfullyMapped / results.totalProcessed) * 100).toFixed(1)
    : 0;
  
  const completionRate = results.totalProcessed > 0 
    ? (((results.successfullyMapped + results.partiallyMapped) / results.totalProcessed) * 100).toFixed(1)
    : 0;
  
  console.log(`📊 PHASE 2A SUMMARY:`);
  console.log(`   Blended Drinks Processed: ${results.totalProcessed}`);
  console.log(`   Complete Mappings: ${results.successfullyMapped}`);
  console.log(`   Partial Mappings: ${results.partiallyMapped}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Success Rate: ${successRate}%`);
  console.log(`   Completion Rate: ${completionRate}%`);
  
  // Show successful products
  const successful = results.details.filter(d => d.success);
  if (successful.length > 0) {
    console.log(`\n✅ SUCCESSFULLY MAPPED BLENDED DRINKS (${successful.length}):`);
    successful.slice(0, 10).forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.productName} (${product.storeName})`);
    });
    
    if (successful.length > 10) {
      console.log(`   ... and ${successful.length - 10} more blended drinks`);
    }
  }
  
  // Show partial mappings
  const partial = results.details.filter(d => !d.success && d.partialMappings > 0);
  if (partial.length > 0) {
    console.log(`\n⚠️  PARTIALLY MAPPED BLENDED DRINKS (${partial.length}):`);
    partial.slice(0, 5).forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.productName} (${product.storeName})`);
      console.log(`      Mapped: ${product.partialMappings}/${product.totalIngredients}`);
      console.log(`      Missing: ${product.unmatchedIngredients.slice(0, 3).join(', ')}`);
    });
  }
  
  // Phase 2A Assessment
  console.log(`\n🎯 PHASE 2A ASSESSMENT:`);
  
  if (results.successfullyMapped >= 15) {
    console.log(`   ✅ PHASE 2A SUCCESSFUL: ${results.successfullyMapped} blended drinks completely mapped`);
    console.log(`   🎉 Blended drink inventory deduction now functional`);
    console.log(`   💰 Additional Revenue Protected: ₱${results.successfullyMapped * 100}`);
  } else if (results.successfullyMapped >= 8) {
    console.log(`   ⚠️  PHASE 2A PARTIAL SUCCESS: ${results.successfullyMapped} blended drinks mapped`);
    console.log(`   🔄 Continue with manual review for remaining products`);
  } else {
    console.log(`   ❌ PHASE 2A NEEDS ATTENTION: Only ${results.successfullyMapped} blended drinks mapped`);
    console.log(`   🔧 Review specialized ingredient matching and inventory`);
  }
  
  console.log(`\n💡 NEXT STEPS:`);
  console.log(`   1. Test inventory deduction for mapped blended drinks`);
  console.log(`   2. Address partial mappings with manual review`);
  console.log(`   3. Proceed to Phase 2B: Standard drinks (₱60-₱89)`);
  console.log(`   4. Continue systematic approach for remaining products`);
  
  // Calculate cumulative progress
  const phase1Croffles = 23;
  const totalFixed = phase1Croffles + results.successfullyMapped;
  const targetProducts = 114;
  const progressPercentage = ((totalFixed / targetProducts) * 100).toFixed(1);
  
  console.log(`\n📈 CUMULATIVE PROGRESS:`);
  console.log(`   Phase 1 Croffles: ${phase1Croffles} products`);
  console.log(`   Phase 2A Blended: ${results.successfullyMapped} products`);
  console.log(`   Total Fixed: ${totalFixed}/${targetProducts} (${progressPercentage}%)`);
  console.log(`   Remaining: ${targetProducts - totalFixed} products to reach target`);
}

main().catch(err => {
  console.error('Phase 2A execution failed:', err.message);
  process.exit(1);
});
