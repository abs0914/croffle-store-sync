#!/usr/bin/env node

/**
 * Comprehensive Recipe Pipeline Investigation
 * 
 * Analyzes the complete recipe deployment pipeline from recipe_templates to product_catalog
 * to identify data integrity issues and assess system reset feasibility.
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
          if (res.statusCode >= 400) return reject(new Error(json?.message || body));
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

async function fetchData(table, select = '*', filter = '') {
  const path = `/rest/v1/${table}?select=${select}${filter ? '&' + filter : ''}`;
  return await req({
    hostname: SUPABASE_URL,
    port: 443,
    path,
    method: 'GET',
    headers
  });
}

async function main() {
  console.log('🔍 COMPREHENSIVE RECIPE PIPELINE INVESTIGATION');
  console.log('=' .repeat(80));
  
  await auth();

  // ===== PHASE 1: PIPELINE FLOW ANALYSIS =====
  console.log('\n📊 PHASE 1: PIPELINE FLOW ANALYSIS');
  console.log('-'.repeat(50));

  // Get all recipe templates
  const templates = await fetchData('recipe_templates', 'id,name,category_name,is_active');
  const activeTemplates = templates.filter(t => t.is_active);
  
  // Get all recipes with template relationships
  const recipes = await fetchData('recipes', 'id,name,template_id,store_id,is_active');
  const activeRecipes = recipes.filter(r => r.is_active);
  
  // Get all product catalog entries with recipe relationships
  const productCatalog = await fetchData('product_catalog', 'id,product_name,recipe_id,store_id,category_id,is_available');
  
  // Get all stores for context
  const stores = await fetchData('stores', 'id,name');
  
  console.log(`📋 Data Overview:`);
  console.log(`   Recipe Templates (total): ${templates.length}`);
  console.log(`   Recipe Templates (active): ${activeTemplates.length}`);
  console.log(`   Recipes (total): ${recipes.length}`);
  console.log(`   Recipes (active): ${activeRecipes.length}`);
  console.log(`   Product Catalog entries: ${productCatalog.length}`);
  console.log(`   Stores: ${stores.length}`);

  // ===== PHASE 2: RELATIONSHIP INTEGRITY ANALYSIS =====
  console.log('\n🔗 PHASE 2: RELATIONSHIP INTEGRITY ANALYSIS');
  console.log('-'.repeat(50));

  // Check template → recipe relationships
  const templateIds = new Set(activeTemplates.map(t => t.id));
  const recipesWithValidTemplates = activeRecipes.filter(r => r.template_id && templateIds.has(r.template_id));
  const recipesWithInvalidTemplates = activeRecipes.filter(r => r.template_id && !templateIds.has(r.template_id));
  const recipesWithoutTemplates = activeRecipes.filter(r => !r.template_id);

  console.log(`🔗 Template → Recipe Relationships:`);
  console.log(`   Recipes with valid template links: ${recipesWithValidTemplates.length}`);
  console.log(`   Recipes with invalid template links: ${recipesWithInvalidTemplates.length}`);
  console.log(`   Recipes without template links: ${recipesWithoutTemplates.length}`);

  if (recipesWithInvalidTemplates.length > 0) {
    console.log(`   ❌ BROKEN LINKS - Recipes pointing to non-existent templates:`);
    recipesWithInvalidTemplates.slice(0, 10).forEach(r => 
      console.log(`      - ${r.name} (${r.id}) → template_id: ${r.template_id}`)
    );
  }

  // Check recipe → product_catalog relationships
  const recipeIds = new Set(activeRecipes.map(r => r.id));
  const catalogWithValidRecipes = productCatalog.filter(p => p.recipe_id && recipeIds.has(p.recipe_id));
  const catalogWithInvalidRecipes = productCatalog.filter(p => p.recipe_id && !recipeIds.has(p.recipe_id));
  const catalogWithoutRecipes = productCatalog.filter(p => !p.recipe_id);

  console.log(`🔗 Recipe → Product Catalog Relationships:`);
  console.log(`   Catalog entries with valid recipe links: ${catalogWithValidRecipes.length}`);
  console.log(`   Catalog entries with invalid recipe links: ${catalogWithInvalidRecipes.length}`);
  console.log(`   Catalog entries without recipe links: ${catalogWithoutRecipes.length}`);

  if (catalogWithInvalidRecipes.length > 0) {
    console.log(`   ❌ BROKEN LINKS - Catalog entries pointing to non-existent recipes:`);
    catalogWithInvalidRecipes.slice(0, 10).forEach(p => 
      console.log(`      - ${p.product_name} (${p.id}) → recipe_id: ${p.recipe_id}`)
    );
  }

  // ===== PHASE 3: STORE-BY-STORE ANALYSIS =====
  console.log('\n🏪 PHASE 3: STORE-BY-STORE ANALYSIS');
  console.log('-'.repeat(50));

  const storeAnalysis = [];
  for (const store of stores) {
    const storeRecipes = activeRecipes.filter(r => r.store_id === store.id);
    const storeCatalog = productCatalog.filter(p => p.store_id === store.id);
    
    // Count templates deployed to this store
    const deployedTemplateIds = new Set(
      storeRecipes
        .filter(r => r.template_id)
        .map(r => r.template_id)
    );
    
    const analysis = {
      store: store,
      recipes: storeRecipes.length,
      catalog: storeCatalog.length,
      deployedTemplates: deployedTemplateIds.size,
      missingFromCatalog: storeRecipes.length - storeCatalog.filter(p => p.recipe_id).length,
      catalogWithoutRecipes: storeCatalog.filter(p => !p.recipe_id).length
    };
    
    storeAnalysis.push(analysis);
    
    console.log(`🏪 ${store.name} (${store.id}):`);
    console.log(`   Recipes deployed: ${analysis.recipes}`);
    console.log(`   Product catalog entries: ${analysis.catalog}`);
    console.log(`   Templates deployed: ${analysis.deployedTemplates}/${activeTemplates.length}`);
    console.log(`   Recipes missing from catalog: ${analysis.missingFromCatalog}`);
    console.log(`   Catalog entries without recipes: ${analysis.catalogWithoutRecipes}`);
  }

  // ===== PHASE 4: CATEGORY MAPPING ANALYSIS =====
  console.log('\n🏷️ PHASE 4: CATEGORY MAPPING ANALYSIS');
  console.log('-'.repeat(50));

  // Get categories
  const categories = await fetchData('categories', 'id,name,store_id,is_active');
  
  // Analyze category assignments
  const catalogWithCategories = productCatalog.filter(p => p.category_id);
  const catalogWithoutCategories = productCatalog.filter(p => !p.category_id);
  
  console.log(`🏷️ Category Assignment Analysis:`);
  console.log(`   Product catalog with categories: ${catalogWithCategories.length}`);
  console.log(`   Product catalog without categories: ${catalogWithoutCategories.length}`);
  console.log(`   Total categories across all stores: ${categories.length}`);

  // Check for invalid category references
  const categoryIds = new Set(categories.map(c => c.id));
  const catalogWithInvalidCategories = catalogWithCategories.filter(p => !categoryIds.has(p.category_id));
  
  if (catalogWithInvalidCategories.length > 0) {
    console.log(`   ❌ BROKEN CATEGORY LINKS: ${catalogWithInvalidCategories.length}`);
    catalogWithInvalidCategories.slice(0, 5).forEach(p => 
      console.log(`      - ${p.product_name} → category_id: ${p.category_id}`)
    );
  }

  // ===== PHASE 5: DATA INTEGRITY ISSUES SUMMARY =====
  console.log('\n⚠️ PHASE 5: DATA INTEGRITY ISSUES SUMMARY');
  console.log('-'.repeat(50));

  const issues = [];
  
  if (recipesWithInvalidTemplates.length > 0) {
    issues.push(`${recipesWithInvalidTemplates.length} recipes with invalid template_id references`);
  }
  
  if (catalogWithInvalidRecipes.length > 0) {
    issues.push(`${catalogWithInvalidRecipes.length} product_catalog entries with invalid recipe_id references`);
  }
  
  if (catalogWithInvalidCategories.length > 0) {
    issues.push(`${catalogWithInvalidCategories.length} product_catalog entries with invalid category_id references`);
  }
  
  if (catalogWithoutCategories.length > 0) {
    issues.push(`${catalogWithoutCategories.length} product_catalog entries without category assignments`);
  }

  const totalMissingFromCatalog = storeAnalysis.reduce((sum, s) => sum + s.missingFromCatalog, 0);
  if (totalMissingFromCatalog > 0) {
    issues.push(`${totalMissingFromCatalog} recipes not reflected in product_catalog across all stores`);
  }

  console.log(`📋 Critical Issues Found: ${issues.length}`);
  if (issues.length > 0) {
    issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
  } else {
    console.log(`   ✅ No critical data integrity issues detected`);
  }

  // ===== PHASE 6: SYSTEM RESET RECOMMENDATION =====
  console.log('\n🔄 PHASE 6: SYSTEM RESET RECOMMENDATION');
  console.log('-'.repeat(50));

  const severityScore = (
    recipesWithInvalidTemplates.length * 3 +
    catalogWithInvalidRecipes.length * 2 +
    catalogWithInvalidCategories.length * 1 +
    (totalMissingFromCatalog > 20 ? 5 : 0)
  );

  console.log(`🎯 Severity Score: ${severityScore}`);
  console.log(`   (0-5: Minor issues, 6-15: Moderate issues, 16+: Major issues requiring reset)`);

  if (severityScore >= 16) {
    console.log(`\n❌ RECOMMENDATION: SYSTEM RESET REQUIRED`);
    console.log(`   The data integrity issues are severe enough to warrant a complete rebuild.`);
  } else if (severityScore >= 6) {
    console.log(`\n⚠️ RECOMMENDATION: TARGETED FIXES WITH MONITORING`);
    console.log(`   Issues can be resolved with targeted data cleanup and process improvements.`);
  } else {
    console.log(`\n✅ RECOMMENDATION: MINOR FIXES SUFFICIENT`);
    console.log(`   Current issues are manageable with incremental fixes.`);
  }

  return {
    templates: activeTemplates.length,
    recipes: activeRecipes.length,
    catalog: productCatalog.length,
    stores: stores.length,
    issues: issues.length,
    severityScore,
    storeAnalysis
  };
}

main().catch(err => {
  console.error('Investigation failed:', err.message);
  process.exit(1);
});
