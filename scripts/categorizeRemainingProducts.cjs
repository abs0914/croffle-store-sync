#!/usr/bin/env node

/**
 * Categorize Remaining Unmapped Products
 * 
 * Analyzes the 258 remaining products and categorizes them by issue type for systematic resolution
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

// Fuzzy matching function
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Word overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);
  
  return wordSimilarity;
}

async function main() {
  console.log('🔍 CATEGORIZING REMAINING UNMAPPED PRODUCTS');
  console.log('=' .repeat(70));
  
  await auth();

  // Get all active stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });
  
  const categories = {
    ambiguousMatches: [],
    missingInventory: [],
    complexRecipes: [],
    namingMismatches: [],
    highPriority: [],
    mediumPriority: [],
    lowPriority: []
  };
  
  let totalAnalyzed = 0;
  
  for (const store of stores) {
    console.log(`\n🏪 Analyzing: ${store.name}`);
    console.log('-'.repeat(50));
    
    const storeResults = await analyzeStore(store);
    totalAnalyzed += storeResults.analyzed;
    
    // Merge results
    categories.ambiguousMatches.push(...storeResults.ambiguousMatches);
    categories.missingInventory.push(...storeResults.missingInventory);
    categories.complexRecipes.push(...storeResults.complexRecipes);
    categories.namingMismatches.push(...storeResults.namingMismatches);
    
    // Categorize by priority
    storeResults.products.forEach(product => {
      if (product.price >= 90) {
        categories.highPriority.push(product);
      } else if (product.price >= 10) {
        categories.mediumPriority.push(product);
      } else {
        categories.lowPriority.push(product);
      }
    });
  }
  
  // Generate comprehensive report
  await generateCategorizedReport(categories, totalAnalyzed);
}

async function analyzeStore(store) {
  const results = {
    analyzed: 0,
    products: [],
    ambiguousMatches: [],
    missingInventory: [],
    complexRecipes: [],
    namingMismatches: []
  };
  
  // Get unmapped products
  const products = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&recipe_id=not.is.null`,
    method: 'GET',
    headers
  });
  
  // Get existing mappings
  const existingMappings = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${products.map(p => p.id).join(',')})`,
    method: 'GET',
    headers
  });
  
  const mappedProductIds = new Set(existingMappings.map(m => m.product_catalog_id));
  const unmappedProducts = products.filter(p => !mappedProductIds.has(p.id));
  
  // Get inventory items
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Unmapped Products: ${unmappedProducts.length}`);
  console.log(`   📦 Inventory Items: ${inventoryItems.length}`);
  
  for (const product of unmappedProducts) {
    results.analyzed++;
    results.products.push(product);
    
    try {
      // Get recipe ingredients
      const recipeIngredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
        method: 'GET',
        headers
      });
      
      const productAnalysis = {
        product,
        store: store.name,
        recipeIngredients,
        issues: []
      };
      
      // Analyze each recipe ingredient
      for (const recipeIng of recipeIngredients) {
        const matches = inventoryItems.map(inv => ({
          inventory: inv,
          similarity: calculateSimilarity(recipeIng.ingredient_name, inv.item)
        })).filter(m => m.similarity > 0.3).sort((a, b) => b.similarity - a.similarity);
        
        if (matches.length === 0) {
          // No matches - missing inventory
          productAnalysis.issues.push({
            type: 'missing_inventory',
            ingredient: recipeIng.ingredient_name,
            message: 'No inventory item found'
          });
        } else if (matches.length === 1 && matches[0].similarity < 0.8) {
          // Single fuzzy match - naming mismatch
          productAnalysis.issues.push({
            type: 'naming_mismatch',
            ingredient: recipeIng.ingredient_name,
            bestMatch: matches[0].inventory.item,
            similarity: matches[0].similarity
          });
        } else if (matches.length > 1) {
          // Multiple matches - ambiguous
          productAnalysis.issues.push({
            type: 'ambiguous_match',
            ingredient: recipeIng.ingredient_name,
            matches: matches.slice(0, 3).map(m => ({
              item: m.inventory.item,
              similarity: m.similarity
            }))
          });
        }
      }
      
      // Categorize the product
      if (recipeIngredients.length > 4) {
        results.complexRecipes.push(productAnalysis);
      } else if (productAnalysis.issues.some(i => i.type === 'ambiguous_match')) {
        results.ambiguousMatches.push(productAnalysis);
      } else if (productAnalysis.issues.some(i => i.type === 'missing_inventory')) {
        results.missingInventory.push(productAnalysis);
      } else if (productAnalysis.issues.some(i => i.type === 'naming_mismatch')) {
        results.namingMismatches.push(productAnalysis);
      }
      
    } catch (error) {
      console.log(`   ❌ Error analyzing ${product.product_name}: ${error.message}`);
    }
  }
  
  console.log(`   📊 Ambiguous: ${results.ambiguousMatches.length}`);
  console.log(`   📊 Missing Inventory: ${results.missingInventory.length}`);
  console.log(`   📊 Complex Recipes: ${results.complexRecipes.length}`);
  console.log(`   📊 Naming Mismatches: ${results.namingMismatches.length}`);
  
  return results;
}

async function generateCategorizedReport(categories, totalAnalyzed) {
  console.log('\n📋 CATEGORIZATION REPORT');
  console.log('=' .repeat(70));
  
  console.log(`\n📊 ANALYSIS SUMMARY:`);
  console.log(`   Total Products Analyzed: ${totalAnalyzed}`);
  console.log(`   Ambiguous Matches: ${categories.ambiguousMatches.length}`);
  console.log(`   Missing Inventory: ${categories.missingInventory.length}`);
  console.log(`   Complex Recipes: ${categories.complexRecipes.length}`);
  console.log(`   Naming Mismatches: ${categories.namingMismatches.length}`);
  
  console.log(`\n💰 PRIORITY BREAKDOWN:`);
  console.log(`   High Priority (₱90+): ${categories.highPriority.length} products`);
  console.log(`   Medium Priority (₱10-89): ${categories.mediumPriority.length} products`);
  console.log(`   Low Priority (<₱10): ${categories.lowPriority.length} products`);
  
  // Show examples from each category
  console.log(`\n🔍 CATEGORY EXAMPLES:`);
  
  if (categories.ambiguousMatches.length > 0) {
    console.log(`\n   AMBIGUOUS MATCHES (${categories.ambiguousMatches.length} products):`);
    categories.ambiguousMatches.slice(0, 3).forEach((item, i) => {
      console.log(`     ${i + 1}. ${item.product.product_name} (${item.store})`);
      item.issues.filter(issue => issue.type === 'ambiguous_match').forEach(issue => {
        console.log(`        Ingredient: ${issue.ingredient}`);
        issue.matches.forEach(match => {
          console.log(`          → ${match.item} (${(match.similarity * 100).toFixed(1)}% match)`);
        });
      });
    });
  }
  
  if (categories.missingInventory.length > 0) {
    console.log(`\n   MISSING INVENTORY (${categories.missingInventory.length} products):`);
    categories.missingInventory.slice(0, 3).forEach((item, i) => {
      console.log(`     ${i + 1}. ${item.product.product_name} (${item.store})`);
      item.issues.filter(issue => issue.type === 'missing_inventory').forEach(issue => {
        console.log(`        Missing: ${issue.ingredient}`);
      });
    });
  }
  
  if (categories.namingMismatches.length > 0) {
    console.log(`\n   NAMING MISMATCHES (${categories.namingMismatches.length} products):`);
    categories.namingMismatches.slice(0, 3).forEach((item, i) => {
      console.log(`     ${i + 1}. ${item.product.product_name} (${item.store})`);
      item.issues.filter(issue => issue.type === 'naming_mismatch').forEach(issue => {
        console.log(`        ${issue.ingredient} → ${issue.bestMatch} (${(issue.similarity * 100).toFixed(1)}% match)`);
      });
    });
  }
  
  console.log(`\n🎯 RECOMMENDED PROCESSING ORDER:`);
  console.log(`   1. High Priority Naming Mismatches (quick wins)`);
  console.log(`   2. High Priority Missing Inventory (create items)`);
  console.log(`   3. Medium Priority Ambiguous Matches (manual review)`);
  console.log(`   4. Complex Recipes (detailed analysis)`);
  console.log(`   5. Low Priority items (batch processing)`);
}

main().catch(err => {
  console.error('Categorization failed:', err.message);
  process.exit(1);
});
