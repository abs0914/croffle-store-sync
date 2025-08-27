#!/usr/bin/env node

/**
 * Detailed Data Consistency Audit
 * 
 * Deep dive into data consistency issues including duplicates, orphaned records,
 * and deployment pattern analysis across all stores.
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

function findDuplicates(array, keyFn) {
  const seen = new Map();
  const duplicates = [];
  
  array.forEach(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      if (!seen.get(key).isDuplicate) {
        seen.get(key).isDuplicate = true;
        duplicates.push(seen.get(key));
      }
      duplicates.push({ ...item, isDuplicate: true });
    } else {
      seen.set(key, item);
    }
  });
  
  return duplicates;
}

async function main() {
  console.log('🔍 DETAILED DATA CONSISTENCY AUDIT');
  console.log('=' .repeat(80));
  
  await auth();

  // Fetch all data with detailed relationships
  const templates = await fetchData('recipe_templates', 'id,name,category_name,is_active,created_at');
  const recipes = await fetchData('recipes', 'id,name,template_id,store_id,is_active,created_at');
  const productCatalog = await fetchData('product_catalog', 'id,product_name,recipe_id,store_id,category_id,is_available,created_at,display_order');
  const categories = await fetchData('categories', 'id,name,store_id,is_active');
  const stores = await fetchData('stores', 'id,name');

  // ===== DUPLICATE ANALYSIS =====
  console.log('\n🔄 DUPLICATE ANALYSIS');
  console.log('-'.repeat(50));

  // Check for duplicate recipe templates
  const duplicateTemplates = findDuplicates(templates, t => t.name.toLowerCase().trim());
  console.log(`📋 Recipe Template Duplicates: ${duplicateTemplates.length}`);
  if (duplicateTemplates.length > 0) {
    const grouped = {};
    duplicateTemplates.forEach(t => {
      const key = t.name.toLowerCase().trim();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });
    Object.entries(grouped).slice(0, 5).forEach(([name, items]) => {
      console.log(`   - "${name}": ${items.length} copies`);
      items.forEach(item => console.log(`     * ${item.id} (${item.is_active ? 'active' : 'inactive'})`));
    });
  }

  // Check for duplicate recipes per store
  const duplicateRecipes = findDuplicates(recipes, r => `${r.store_id}-${r.name.toLowerCase().trim()}`);
  console.log(`📋 Recipe Duplicates (per store): ${duplicateRecipes.length}`);

  // Check for duplicate product catalog entries per store
  const duplicateCatalog = findDuplicates(productCatalog, p => `${p.store_id}-${p.product_name.toLowerCase().trim()}`);
  console.log(`📋 Product Catalog Duplicates (per store): ${duplicateCatalog.length}`);

  // ===== DEPLOYMENT PATTERN ANALYSIS =====
  console.log('\n📊 DEPLOYMENT PATTERN ANALYSIS');
  console.log('-'.repeat(50));

  // Analyze which templates are deployed to which stores
  const templateDeployment = new Map();
  templates.forEach(t => {
    templateDeployment.set(t.id, {
      template: t,
      deployedStores: new Set(),
      totalRecipes: 0,
      totalCatalogEntries: 0
    });
  });

  recipes.forEach(r => {
    if (r.template_id && templateDeployment.has(r.template_id)) {
      const deployment = templateDeployment.get(r.template_id);
      deployment.deployedStores.add(r.store_id);
      deployment.totalRecipes++;
    }
  });

  productCatalog.forEach(p => {
    if (p.recipe_id) {
      const recipe = recipes.find(r => r.id === p.recipe_id);
      if (recipe && recipe.template_id && templateDeployment.has(recipe.template_id)) {
        templateDeployment.get(recipe.template_id).totalCatalogEntries++;
      }
    }
  });

  // Find inconsistent deployments
  const inconsistentDeployments = [];
  const partialDeployments = [];
  const fullDeployments = [];

  templateDeployment.forEach((deployment, templateId) => {
    const storeCount = deployment.deployedStores.size;
    const expectedCatalogEntries = deployment.totalRecipes;
    const actualCatalogEntries = deployment.totalCatalogEntries;
    
    if (storeCount === 0) {
      // Template not deployed anywhere
      return;
    } else if (storeCount === stores.length) {
      fullDeployments.push(deployment);
    } else {
      partialDeployments.push(deployment);
    }
    
    if (expectedCatalogEntries !== actualCatalogEntries) {
      inconsistentDeployments.push({
        ...deployment,
        expectedCatalog: expectedCatalogEntries,
        actualCatalog: actualCatalogEntries,
        missing: expectedCatalogEntries - actualCatalogEntries
      });
    }
  });

  console.log(`📊 Deployment Patterns:`);
  console.log(`   Templates deployed to all stores: ${fullDeployments.length}`);
  console.log(`   Templates partially deployed: ${partialDeployments.length}`);
  console.log(`   Templates with catalog inconsistencies: ${inconsistentDeployments.length}`);

  if (partialDeployments.length > 0) {
    console.log(`\n⚠️ Partial Deployments (first 10):`);
    partialDeployments.slice(0, 10).forEach(d => {
      console.log(`   - ${d.template.name}: deployed to ${d.deployedStores.size}/${stores.length} stores`);
    });
  }

  if (inconsistentDeployments.length > 0) {
    console.log(`\n❌ Catalog Inconsistencies (first 10):`);
    inconsistentDeployments.slice(0, 10).forEach(d => {
      console.log(`   - ${d.template.name}: ${d.actualCatalog}/${d.expectedCatalog} in catalog (${d.missing} missing)`);
    });
  }

  // ===== CATEGORY CONSISTENCY ANALYSIS =====
  console.log('\n🏷️ CATEGORY CONSISTENCY ANALYSIS');
  console.log('-'.repeat(50));

  // Check category naming consistency across stores
  const categoryNames = new Map();
  categories.forEach(c => {
    if (!categoryNames.has(c.name)) {
      categoryNames.set(c.name, []);
    }
    categoryNames.get(c.name).push(c);
  });

  const inconsistentCategories = [];
  categoryNames.forEach((cats, name) => {
    const storeIds = new Set(cats.map(c => c.store_id));
    if (storeIds.size !== stores.length) {
      inconsistentCategories.push({
        name,
        presentInStores: storeIds.size,
        totalStores: stores.length,
        categories: cats
      });
    }
  });

  console.log(`🏷️ Category Consistency:`);
  console.log(`   Unique category names: ${categoryNames.size}`);
  console.log(`   Categories not in all stores: ${inconsistentCategories.length}`);

  if (inconsistentCategories.length > 0) {
    console.log(`\n⚠️ Inconsistent Categories:`);
    inconsistentCategories.forEach(ic => {
      console.log(`   - "${ic.name}": present in ${ic.presentInStores}/${ic.totalStores} stores`);
    });
  }

  // ===== ORPHANED RECORDS ANALYSIS =====
  console.log('\n🔍 ORPHANED RECORDS ANALYSIS');
  console.log('-'.repeat(50));

  // Find recipes without corresponding product catalog entries
  const recipeIds = new Set(recipes.map(r => r.id));
  const catalogRecipeIds = new Set(productCatalog.filter(p => p.recipe_id).map(p => p.recipe_id));
  const recipesWithoutCatalog = recipes.filter(r => !catalogRecipeIds.has(r.id));

  // Find product catalog entries without recipes (we know there are 37 from our sync)
  const catalogWithoutRecipes = productCatalog.filter(p => !p.recipe_id);

  console.log(`🔍 Orphaned Records:`);
  console.log(`   Recipes without catalog entries: ${recipesWithoutCatalog.length}`);
  console.log(`   Catalog entries without recipes: ${catalogWithoutRecipes.length}`);

  // ===== FINAL ASSESSMENT =====
  console.log('\n📋 FINAL DATA CONSISTENCY ASSESSMENT');
  console.log('-'.repeat(50));

  const issues = [];
  
  if (duplicateTemplates.length > 0) issues.push(`${duplicateTemplates.length} duplicate recipe templates`);
  if (duplicateRecipes.length > 0) issues.push(`${duplicateRecipes.length} duplicate recipes`);
  if (duplicateCatalog.length > 0) issues.push(`${duplicateCatalog.length} duplicate catalog entries`);
  if (partialDeployments.length > 0) issues.push(`${partialDeployments.length} templates partially deployed`);
  if (inconsistentDeployments.length > 0) issues.push(`${inconsistentDeployments.length} templates with catalog inconsistencies`);
  if (inconsistentCategories.length > 0) issues.push(`${inconsistentCategories.length} categories not in all stores`);
  if (recipesWithoutCatalog.length > 0) issues.push(`${recipesWithoutCatalog.length} recipes without catalog entries`);

  console.log(`📊 Data Consistency Issues Found: ${issues.length}`);
  if (issues.length > 0) {
    issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
  } else {
    console.log(`   ✅ No significant data consistency issues detected`);
  }

  // Calculate consistency score
  const consistencyScore = Math.max(0, 100 - (
    duplicateTemplates.length * 2 +
    duplicateRecipes.length * 1 +
    duplicateCatalog.length * 1 +
    partialDeployments.length * 3 +
    inconsistentDeployments.length * 2 +
    inconsistentCategories.length * 1
  ));

  console.log(`\n🎯 Data Consistency Score: ${consistencyScore}/100`);
  if (consistencyScore >= 90) {
    console.log(`   ✅ EXCELLENT - Data is highly consistent`);
  } else if (consistencyScore >= 70) {
    console.log(`   ⚠️ GOOD - Minor consistency issues`);
  } else if (consistencyScore >= 50) {
    console.log(`   ⚠️ FAIR - Moderate consistency issues`);
  } else {
    console.log(`   ❌ POOR - Major consistency issues requiring attention`);
  }

  return {
    duplicateTemplates: duplicateTemplates.length,
    duplicateRecipes: duplicateRecipes.length,
    duplicateCatalog: duplicateCatalog.length,
    partialDeployments: partialDeployments.length,
    inconsistentDeployments: inconsistentDeployments.length,
    inconsistentCategories: inconsistentCategories.length,
    consistencyScore,
    totalIssues: issues.length
  };
}

main().catch(err => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
