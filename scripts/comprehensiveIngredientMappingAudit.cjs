#!/usr/bin/env node

/**
 * Comprehensive Product Ingredient Mapping Audit
 * 
 * Identifies all products with missing ingredient mappings that could cause inventory sync failures
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
  console.log('🔍 COMPREHENSIVE INGREDIENT MAPPING AUDIT');
  console.log('=' .repeat(80));
  console.log('Analyzing all products for missing ingredient mappings...');
  console.log('=' .repeat(80));
  
  await auth();

  // Step 1: Get all stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name,is_active&order=name.asc',
    method: 'GET',
    headers
  });
  
  console.log(`\n📊 AUDIT SCOPE: ${stores.length} stores found`);
  stores.forEach((store, i) => {
    console.log(`   ${i + 1}. ${store.name} (${store.is_active ? 'Active' : 'Inactive'})`);
  });
  
  // Step 2: Analyze each store
  const auditResults = {
    totalStores: stores.length,
    totalProducts: 0,
    totalWithRecipes: 0,
    totalMissingMappings: 0,
    storeResults: [],
    criticalIssues: [],
    autoFixable: [],
    manualReview: []
  };
  
  for (const store of stores) {
    if (!store.is_active) continue; // Skip inactive stores
    
    console.log(`\n🏪 ANALYZING STORE: ${store.name}`);
    console.log('-'.repeat(60));
    
    const storeResult = await analyzeStore(store);
    auditResults.storeResults.push(storeResult);
    auditResults.totalProducts += storeResult.totalProducts;
    auditResults.totalWithRecipes += storeResult.productsWithRecipes;
    auditResults.totalMissingMappings += storeResult.missingMappings.length;
    auditResults.criticalIssues.push(...storeResult.criticalIssues);
    auditResults.autoFixable.push(...storeResult.autoFixable);
    auditResults.manualReview.push(...storeResult.manualReview);
  }
  
  // Step 3: Generate comprehensive report
  await generateAuditReport(auditResults);
}

async function analyzeStore(store) {
  const storeResult = {
    storeId: store.id,
    storeName: store.name,
    totalProducts: 0,
    availableProducts: 0,
    productsWithRecipes: 0,
    missingMappings: [],
    criticalIssues: [],
    autoFixable: [],
    manualReview: []
  };
  
  // Get all products for this store
  const products = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&order=product_name.asc`,
    method: 'GET',
    headers
  });
  
  storeResult.totalProducts = products.length;
  storeResult.availableProducts = products.filter(p => p.is_available).length;
  
  console.log(`   📦 Products: ${products.length} total, ${storeResult.availableProducts} available`);
  
  // Get all existing ingredient mappings for this store's products
  const existingMappings = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=product_catalog_id&product_catalog_id=in.(${products.map(p => p.id).join(',')})`,
    method: 'GET',
    headers
  });
  
  const mappedProductIds = new Set(existingMappings.map(m => m.product_catalog_id));
  
  // Analyze products with recipes but no mappings
  for (const product of products) {
    if (!product.recipe_id) continue; // Skip products without recipes
    
    storeResult.productsWithRecipes++;
    
    if (mappedProductIds.has(product.id)) continue; // Skip products that already have mappings
    
    // This product has a recipe but no ingredient mappings
    const issue = {
      productId: product.id,
      productName: product.product_name,
      recipeId: product.recipe_id,
      isAvailable: product.is_available,
      price: product.price,
      storeId: store.id,
      storeName: store.name
    };
    
    storeResult.missingMappings.push(issue);
    
    if (product.is_available) {
      storeResult.criticalIssues.push(issue);
    }
  }
  
  console.log(`   🧪 With Recipes: ${storeResult.productsWithRecipes}`);
  console.log(`   ❌ Missing Mappings: ${storeResult.missingMappings.length}`);
  console.log(`   🚨 Critical (Available): ${storeResult.criticalIssues.length}`);
  
  // Analyze each missing mapping for auto-fix potential
  await analyzeMappingPotential(storeResult);
  
  return storeResult;
}

async function analyzeMappingPotential(storeResult) {
  if (storeResult.missingMappings.length === 0) return;
  
  // Get inventory items for this store
  const inventoryItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${storeResult.storeId}&is_active=eq.true`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Inventory Items: ${inventoryItems.length} available`);
  
  for (const issue of storeResult.missingMappings) {
    // Get recipe ingredients for this product
    try {
      const recipeIngredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${issue.recipeId}`,
        method: 'GET',
        headers
      });
      
      issue.recipeIngredients = recipeIngredients;
      issue.mappingPotential = [];
      
      let autoFixableCount = 0;
      let manualReviewCount = 0;
      
      for (const recipeIng of recipeIngredients) {
        const matches = inventoryItems.filter(inv => 
          inv.item.toLowerCase().includes(recipeIng.ingredient_name.toLowerCase()) ||
          recipeIng.ingredient_name.toLowerCase().includes(inv.item.toLowerCase())
        );
        
        if (matches.length === 1) {
          // Perfect match - auto-fixable
          issue.mappingPotential.push({
            ingredient: recipeIng.ingredient_name,
            inventoryMatch: matches[0].item,
            inventoryId: matches[0].id,
            confidence: 'high',
            action: 'auto-fix'
          });
          autoFixableCount++;
        } else if (matches.length > 1) {
          // Multiple matches - manual review needed
          issue.mappingPotential.push({
            ingredient: recipeIng.ingredient_name,
            inventoryMatches: matches.map(m => ({ item: m.item, id: m.id })),
            confidence: 'medium',
            action: 'manual-review'
          });
          manualReviewCount++;
        } else {
          // No matches - needs new inventory item
          issue.mappingPotential.push({
            ingredient: recipeIng.ingredient_name,
            inventoryMatch: null,
            confidence: 'low',
            action: 'create-inventory'
          });
          manualReviewCount++;
        }
      }
      
      // Categorize the issue
      if (autoFixableCount === recipeIngredients.length) {
        storeResult.autoFixable.push(issue);
      } else {
        storeResult.manualReview.push(issue);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Could not analyze recipe for ${issue.productName}: ${error.message}`);
      storeResult.manualReview.push(issue);
    }
  }
  
  console.log(`   ✅ Auto-fixable: ${storeResult.autoFixable.length}`);
  console.log(`   ⚠️  Manual Review: ${storeResult.manualReview.length}`);
}

async function generateAuditReport(auditResults) {
  console.log('\n📋 COMPREHENSIVE AUDIT REPORT');
  console.log('=' .repeat(80));

  // Summary Statistics
  console.log('\n📊 SUMMARY STATISTICS:');
  console.log(`   Total Active Stores: ${auditResults.totalStores}`);
  console.log(`   Total Products: ${auditResults.totalProducts}`);
  console.log(`   Products with Recipes: ${auditResults.totalWithRecipes}`);
  console.log(`   Missing Ingredient Mappings: ${auditResults.totalMissingMappings}`);
  console.log(`   Critical Issues (Available Products): ${auditResults.criticalIssues.length}`);
  console.log(`   Auto-fixable Issues: ${auditResults.autoFixable.length}`);
  console.log(`   Manual Review Required: ${auditResults.manualReview.length}`);

  const percentageMissing = auditResults.totalWithRecipes > 0
    ? ((auditResults.totalMissingMappings / auditResults.totalWithRecipes) * 100).toFixed(1)
    : 0;
  console.log(`   Missing Mappings Rate: ${percentageMissing}%`);

  // Store-by-Store Breakdown
  console.log('\n🏪 STORE-BY-STORE BREAKDOWN:');
  auditResults.storeResults.forEach((store, i) => {
    if (store.missingMappings.length > 0) {
      console.log(`\n   ${i + 1}. ${store.storeName}:`);
      console.log(`      Products: ${store.totalProducts} total, ${store.productsWithRecipes} with recipes`);
      console.log(`      Missing Mappings: ${store.missingMappings.length}`);
      console.log(`      Critical: ${store.criticalIssues.length} | Auto-fix: ${store.autoFixable.length} | Manual: ${store.manualReview.length}`);
    }
  });

  // Critical Issues Detail
  if (auditResults.criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES (Available Products):');
    auditResults.criticalIssues.forEach((issue, i) => {
      console.log(`\n   ${i + 1}. ${issue.productName} (${issue.storeName})`);
      console.log(`      Product ID: ${issue.productId}`);
      console.log(`      Price: ₱${issue.price}`);
      console.log(`      Recipe Ingredients: ${issue.recipeIngredients?.length || 'Unknown'}`);
    });
  }

  // Auto-fixable Issues
  if (auditResults.autoFixable.length > 0) {
    console.log('\n✅ AUTO-FIXABLE ISSUES:');
    auditResults.autoFixable.slice(0, 10).forEach((issue, i) => {
      console.log(`\n   ${i + 1}. ${issue.productName} (${issue.storeName})`);
      console.log(`      Recipe Ingredients: ${issue.recipeIngredients?.length || 0}`);
      if (issue.mappingPotential) {
        issue.mappingPotential.forEach(mapping => {
          if (mapping.action === 'auto-fix') {
            console.log(`        ✅ ${mapping.ingredient} → ${mapping.inventoryMatch}`);
          }
        });
      }
    });

    if (auditResults.autoFixable.length > 10) {
      console.log(`\n   ... and ${auditResults.autoFixable.length - 10} more auto-fixable issues`);
    }
  }

  // Action Plan
  console.log('\n🎯 RECOMMENDED ACTION PLAN:');
  console.log('\n   PRIORITY 1 - IMMEDIATE ACTION:');
  console.log(`   • Fix ${auditResults.criticalIssues.length} critical issues (available products)`);
  console.log(`   • Auto-create ${auditResults.autoFixable.length} mappings with high confidence matches`);

  console.log('\n   PRIORITY 2 - MANUAL REVIEW:');
  console.log(`   • Review ${auditResults.manualReview.length} products requiring manual intervention`);
  console.log(`   • Create missing inventory items where needed`);
  console.log(`   • Resolve ambiguous ingredient mappings`);

  console.log('\n   PRIORITY 3 - PREVENTIVE MEASURES:');
  console.log(`   • Implement automatic mapping creation during recipe deployment`);
  console.log(`   • Add validation checks for products without ingredient mappings`);
  console.log(`   • Create monitoring dashboard for mapping completeness`);

  console.log('\n📋 NEXT STEPS:');
  console.log('   1. Run auto-fix script for high-confidence mappings');
  console.log('   2. Review manual intervention cases');
  console.log('   3. Test inventory deduction on fixed products');
  console.log('   4. Implement preventive measures');

  console.log('\n✅ AUDIT COMPLETE');
  console.log(`   Found ${auditResults.totalMissingMappings} products with missing ingredient mappings`);
  console.log(`   ${auditResults.autoFixable.length} can be auto-fixed immediately`);
  console.log(`   ${auditResults.manualReview.length} require manual review`);
}

main().catch(err => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
