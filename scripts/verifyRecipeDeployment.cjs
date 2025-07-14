#!/usr/bin/env node

/**
 * Verify Recipe Deployment Results
 * 
 * This script verifies that recipes were successfully deployed from Sugbo Mercado
 * to the target stores and provides detailed comparison and analysis.
 * 
 * Usage: node scripts/verifyRecipeDeployment.cjs
 */

const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// Store names to verify
const SOURCE_STORE_NAME = 'Sugbo Mercado (IT Park, Cebu)';
const TARGET_STORES = [
  'SM City Cebu',
  'SM Savemore Tacloban'
];

let authToken = null;

// Headers for API requests
const getHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  ...(authToken && { 'Authorization': `Bearer ${authToken}` })
});

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

// Authenticate as admin
async function authenticateAdmin() {
  console.log('🔐 Authenticating as admin...');
  
  const authOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };

  const authData = {
    email: 'admin@example.com',
    password: 'password123'
  };

  try {
    const response = await makeRequest(authOptions, authData);
    authToken = response.access_token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Find store by name
async function findStoreByName(storeName) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/stores?select=*&name=eq.${encodeURIComponent(storeName)}`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const stores = await makeRequest(options);
    return stores.length > 0 ? stores[0] : null;
  } catch (error) {
    console.error(`Error finding store "${storeName}":`, error.message);
    return null;
  }
}

// Get all recipe templates
async function getAllRecipeTemplates() {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/recipe_templates?select=*&is_active=eq.true&order=category_name,name',
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const templates = await makeRequest(options);
    return templates || [];
  } catch (error) {
    console.error('Error fetching recipe templates:', error.message);
    return [];
  }
}

// Get recipes for a specific store
async function getStoreRecipes(storeId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipes?select=*,recipe_templates(name,category_name)&store_id=eq.${storeId}&order=name`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const recipes = await makeRequest(options);
    return recipes || [];
  } catch (error) {
    console.error(`Error fetching recipes for store ${storeId}:`, error.message);
    return [];
  }
}

// Get recipe ingredients for a recipe
async function getRecipeIngredients(recipeId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_ingredients?select=*,inventory_stock(item,unit)&recipe_id=eq.${recipeId}`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const ingredients = await makeRequest(options);
    return ingredients || [];
  } catch (error) {
    console.error(`Error fetching ingredients for recipe ${recipeId}:`, error.message);
    return [];
  }
}

// Get deployment records for a store
async function getDeploymentRecords(storeId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_deployments?select=*,recipe_templates(name,category_name)&store_id=eq.${storeId}&order=created_at.desc`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const deployments = await makeRequest(options);
    return deployments || [];
  } catch (error) {
    console.error(`Error fetching deployment records for store ${storeId}:`, error.message);
    return [];
  }
}

// Analyze recipe deployment for a store
async function analyzeStoreDeployment(store, allTemplates) {
  console.log(`\n📊 Analyzing deployment for ${store.name}:`);
  
  const recipes = await getStoreRecipes(store.id);
  const deployments = await getDeploymentRecords(store.id);
  
  console.log(`   📋 Total recipes: ${recipes.length}`);
  console.log(`   📦 Deployment records: ${deployments.length}`);
  
  // Group by category
  const recipesByCategory = {};
  const templatesByCategory = {};
  
  recipes.forEach(recipe => {
    const category = recipe.recipe_templates?.category_name || 'Other';
    if (!recipesByCategory[category]) {
      recipesByCategory[category] = [];
    }
    recipesByCategory[category].push(recipe);
  });
  
  allTemplates.forEach(template => {
    const category = template.category_name || 'Other';
    if (!templatesByCategory[category]) {
      templatesByCategory[category] = [];
    }
    templatesByCategory[category].push(template);
  });
  
  console.log('\n   📋 Recipes by category:');
  Object.entries(templatesByCategory).forEach(([category, templates]) => {
    const deployedCount = recipesByCategory[category]?.length || 0;
    const percentage = templates.length > 0 ? ((deployedCount / templates.length) * 100).toFixed(1) : '0.0';
    console.log(`      ${category}: ${deployedCount}/${templates.length} (${percentage}%)`);
  });
  
  // Find missing recipes
  const deployedTemplateIds = new Set(recipes.map(r => r.template_id).filter(Boolean));
  const missingTemplates = allTemplates.filter(t => !deployedTemplateIds.has(t.id));
  
  if (missingTemplates.length > 0) {
    console.log(`\n   ❌ Missing recipes (${missingTemplates.length}):`);
    missingTemplates.slice(0, 5).forEach(template => {
      console.log(`      - ${template.name} (${template.category_name || 'Other'})`);
    });
    if (missingTemplates.length > 5) {
      console.log(`      ... and ${missingTemplates.length - 5} more`);
    }
  }
  
  // Check ingredient mapping quality
  let totalIngredients = 0;
  let mappedIngredients = 0;
  
  for (const recipe of recipes.slice(0, 10)) { // Sample first 10 recipes
    const ingredients = await getRecipeIngredients(recipe.id);
    totalIngredients += ingredients.length;
    mappedIngredients += ingredients.filter(ing => ing.inventory_stock_id).length;
  }
  
  const mappingPercentage = totalIngredients > 0 ? ((mappedIngredients / totalIngredients) * 100).toFixed(1) : '0.0';
  console.log(`\n   🔗 Ingredient mapping (sample): ${mappedIngredients}/${totalIngredients} (${mappingPercentage}%)`);
  
  return {
    store: store.name,
    storeId: store.id,
    totalRecipes: recipes.length,
    totalTemplates: allTemplates.length,
    deploymentRecords: deployments.length,
    missingRecipes: missingTemplates.length,
    recipesByCategory,
    missingTemplates: missingTemplates.slice(0, 10), // Limit for output
    ingredientMappingRate: parseFloat(mappingPercentage)
  };
}

// Main verification function
async function main() {
  console.log('🔍 Starting recipe deployment verification...\n');

  // Step 1: Authenticate
  const authenticated = await authenticateAdmin();
  if (!authenticated) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Get all recipe templates
  console.log('\n📋 Fetching recipe templates...');
  const allTemplates = await getAllRecipeTemplates();
  
  if (allTemplates.length === 0) {
    console.log('❌ No recipe templates found');
    return;
  }
  
  console.log(`✅ Found ${allTemplates.length} recipe templates`);
  
  // Group templates by category for overview
  const templatesByCategory = {};
  allTemplates.forEach(template => {
    const category = template.category_name || 'Other';
    if (!templatesByCategory[category]) {
      templatesByCategory[category] = [];
    }
    templatesByCategory[category].push(template);
  });
  
  console.log('\n📊 Templates by category:');
  Object.entries(templatesByCategory).forEach(([category, templates]) => {
    console.log(`   - ${category}: ${templates.length} templates`);
  });

  // Step 3: Verify each target store
  const verificationResults = [];

  for (const targetStoreName of TARGET_STORES) {
    console.log(`\n🏪 Verifying target store: ${targetStoreName}`);
    console.log('='.repeat(50));

    const targetStore = await findStoreByName(targetStoreName);

    if (!targetStore) {
      console.log(`   ❌ Target store "${targetStoreName}" not found`);
      verificationResults.push({
        store: targetStoreName,
        success: false,
        error: 'Store not found'
      });
      continue;
    }

    console.log(`   ✅ Found store: ${targetStore.name} (ID: ${targetStore.id})`);

    const analysis = await analyzeStoreDeployment(targetStore, allTemplates);
    verificationResults.push({
      success: true,
      ...analysis
    });
  }

  // Step 4: Summary
  console.log('\n📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Recipe Templates: ${allTemplates.length}`);
  console.log('');

  verificationResults.forEach(result => {
    if (result.success) {
      const completeness = ((result.totalRecipes / result.totalTemplates) * 100).toFixed(1);
      const status = result.missingRecipes === 0 ? '✅' : '⚠️';
      
      console.log(`${status} ${result.store}:`);
      console.log(`   - Deployed recipes: ${result.totalRecipes}/${result.totalTemplates} (${completeness}%)`);
      console.log(`   - Missing recipes: ${result.missingRecipes}`);
      console.log(`   - Deployment records: ${result.deploymentRecords}`);
      console.log(`   - Ingredient mapping: ${result.ingredientMappingRate}%`);
    } else {
      console.log(`❌ ${result.store}: ${result.error}`);
    }
  });

  const successfulStores = verificationResults.filter(r => r.success).length;
  const completeStores = verificationResults.filter(r => r.success && r.missingRecipes === 0).length;

  console.log('');
  console.log(`📈 Stores verified: ${successfulStores}/${TARGET_STORES.length}`);
  console.log(`✅ Complete deployments: ${completeStores}/${TARGET_STORES.length}`);

  if (completeStores === TARGET_STORES.length) {
    console.log('\n🎉 All recipe deployments are complete and verified!');
    console.log('\n🚀 System ready for:');
    console.log('   - POS operations with full recipe catalog');
    console.log('   - Inventory deduction during order processing');
    console.log('   - Recipe cost calculations and pricing');
  } else if (successfulStores === TARGET_STORES.length) {
    console.log('\n⚠️  Some stores have incomplete recipe deployments.');
    console.log('   Consider re-running the deployment script for missing recipes.');
  } else {
    console.log('\n❌ Some stores could not be verified. Check the errors above.');
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Verification failed:', error.message);
  process.exit(1);
});
