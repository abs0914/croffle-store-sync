#!/usr/bin/env node

/**
 * Re-map Blended Drinks Phase 1B
 * 
 * Re-runs ingredient mapping for the 24 blended drink products that failed in Phase 1
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
  console.log('🔄 RE-MAPPING BLENDED DRINKS - PHASE 1B');
  console.log('=' .repeat(60));
  console.log('Target: 24 blended drink products that failed in Phase 1');
  console.log('Goal: Complete ingredient mappings with new inventory items');
  console.log('=' .repeat(60));
  
  await auth();

  const results = {
    totalProcessed: 0,
    successfullyMapped: 0,
    stillFailing: 0,
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
    console.log('-'.repeat(40));
    
    const storeResult = await remapBlendedDrinksForStore(store);
    
    results.totalProcessed += storeResult.processed;
    results.successfullyMapped += storeResult.successful;
    results.stillFailing += storeResult.failed;
    results.details.push(...storeResult.details);
    
    console.log(`   📊 Processed: ${storeResult.processed} blended drinks`);
    console.log(`   ✅ Successfully mapped: ${storeResult.successful}`);
    console.log(`   ❌ Still failing: ${storeResult.failed}`);
  }
  
  // Generate final report
  generatePhase1BReport(results);
}

async function remapBlendedDrinksForStore(store) {
  const result = {
    processed: 0,
    successful: 0,
    failed: 0,
    details: []
  };
  
  // Get blended drink products
  const blendedProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&product_name=ilike.%blended%&recipe_id=not.is.null&price=gte.90`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Blended drinks found: ${blendedProducts.length}`);
  
  if (blendedProducts.length === 0) return result;
  
  // Get updated inventory items (including newly created ones)
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Available inventory items: ${inventoryItems.length}`);
  
  // Process each blended drink
  for (const product of blendedProducts) {
    result.processed++;
    
    try {
      const mappingResult = await remapProduct(product, inventoryItems, store);
      result.details.push(mappingResult);
      
      if (mappingResult.success) {
        result.successful++;
        console.log(`     ✅ ${product.product_name}: ${mappingResult.mappingsCreated} mappings`);
      } else {
        result.failed++;
        console.log(`     ❌ ${product.product_name}: ${mappingResult.error}`);
      }
      
    } catch (error) {
      result.failed++;
      result.details.push({
        productId: product.id,
        productName: product.product_name,
        success: false,
        error: error.message
      });
      console.log(`     ❌ ${product.product_name}: Error - ${error.message}`);
    }
  }
  
  return result;
}

async function remapProduct(product, inventoryItems, store) {
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
  
  // Create new mappings with improved matching
  const mappings = [];
  const unmatchedIngredients = [];
  
  for (const recipeIng of recipeIngredients) {
    const match = findBestInventoryMatch(recipeIng.ingredient_name, inventoryItems);
    
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
  
  // Only create mappings if we have a complete set
  if (mappings.length === recipeIngredients.length) {
    // Create complete mappings
    await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/product_ingredients',
      method: 'POST',
      headers
    }, mappings);
    
    return {
      productId: product.id,
      productName: product.product_name,
      success: true,
      mappingsCreated: mappings.length,
      totalIngredients: recipeIngredients.length
    };
  } else {
    return {
      productId: product.id,
      productName: product.product_name,
      success: false,
      error: `Missing ingredients: ${unmatchedIngredients.join(', ')}`,
      partialMappings: mappings.length,
      totalIngredients: recipeIngredients.length
    };
  }
}

function findBestInventoryMatch(ingredientName, inventoryItems) {
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
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  // Special blended drink ingredient matching
  const blendedMatches = {
    'oreo': ['oreo cookies', 'cookies'],
    'strawberry': ['strawberry syrup', 'strawberry jam', 'fresh strawberries'],
    'matcha': ['matcha powder'],
    'milk': ['milk'],
    'ice': ['ice', 'crushed ice'],
    'cup': ['blender cup', 'cup'],
    'whipped cream': ['whipped cream topping', 'whipped cream'],
    'vanilla': ['vanilla ice cream'],
    'chocolate': ['chocolate syrup']
  };
  
  for (const [key, matches] of Object.entries(blendedMatches)) {
    if (s1.includes(key) && matches.some(match => s2.includes(match))) {
      return 0.85;
    }
    if (s2.includes(key) && matches.some(match => s1.includes(match))) {
      return 0.85;
    }
  }
  
  // Word overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  
  return commonWords.length / Math.max(words1.length, words2.length);
}

function generatePhase1BReport(results) {
  console.log('\n📋 PHASE 1B RE-MAPPING REPORT');
  console.log('=' .repeat(60));
  
  const successRate = results.totalProcessed > 0 
    ? ((results.successfullyMapped / results.totalProcessed) * 100).toFixed(1)
    : 0;
  
  console.log(`📊 PHASE 1B SUMMARY:`);
  console.log(`   Blended Drinks Processed: ${results.totalProcessed}`);
  console.log(`   Successfully Mapped: ${results.successfullyMapped}`);
  console.log(`   Still Failing: ${results.stillFailing}`);
  console.log(`   Success Rate: ${successRate}%`);
  
  // Show successful products
  const successful = results.details.filter(d => d.success);
  if (successful.length > 0) {
    console.log(`\n✅ SUCCESSFULLY MAPPED BLENDED DRINKS (${successful.length}):`);
    successful.slice(0, 10).forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.productName} - ${product.mappingsCreated} ingredients`);
    });
    
    if (successful.length > 10) {
      console.log(`   ... and ${successful.length - 10} more blended drinks`);
    }
  }
  
  // Show still failing products
  const failing = results.details.filter(d => !d.success);
  if (failing.length > 0) {
    console.log(`\n❌ STILL FAILING BLENDED DRINKS (${failing.length}):`);
    failing.slice(0, 5).forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.productName}`);
      console.log(`      Issue: ${product.error}`);
    });
    
    if (failing.length > 5) {
      console.log(`   ... and ${failing.length - 5} more products`);
    }
  }
  
  // Phase 1B Assessment
  console.log(`\n🎯 PHASE 1B ASSESSMENT:`);
  
  if (results.successfullyMapped >= 20) {
    console.log(`   ✅ PHASE 1B SUCCESSFUL: ${results.successfullyMapped} blended drinks now mapped`);
    console.log(`   🎉 Phase 1 Complete: Croffles + Blended Drinks have inventory deduction`);
    console.log(`   💰 Revenue Impact: ₱${(23 * 125) + (results.successfullyMapped * 100)} in products with accurate cost tracking`);
  } else if (results.successfullyMapped >= 10) {
    console.log(`   ⚠️  PHASE 1B PARTIAL: ${results.successfullyMapped} blended drinks mapped`);
    console.log(`   🔄 Continue with manual review for remaining products`);
  } else {
    console.log(`   ❌ PHASE 1B NEEDS ATTENTION: Only ${results.successfullyMapped} blended drinks mapped`);
    console.log(`   🔧 Review ingredient matching and inventory items`);
  }
  
  console.log(`\n💡 NEXT STEPS:`);
  console.log(`   1. Test inventory deduction for all Phase 1 products`);
  console.log(`   2. Address remaining failing blended drinks manually`);
  console.log(`   3. Proceed to Phase 2: High Priority products (₱60-₱89)`);
  console.log(`   4. Monitor inventory levels for accuracy`);
}

main().catch(err => {
  console.error('Blended drinks re-mapping failed:', err.message);
  process.exit(1);
});
