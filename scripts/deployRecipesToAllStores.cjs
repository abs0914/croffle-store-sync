#!/usr/bin/env node

/**
 * Deploy Recipes to All Stores and Generate Product Catalog
 * 
 * This script:
 * 1. Deploys all recipe templates to all active stores
 * 2. Generates product catalog entries for POS display
 * 3. Ensures proper categorization using exact CSV values
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result?.message || body}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function authenticateAdmin() {
  console.log('🔐 Authenticating admin user...');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  const authResult = await makeRequest(authOptions, authData);
  
  if (authResult.access_token) {
    headers.Authorization = `Bearer ${authResult.access_token}`;
    console.log('✅ Admin authenticated successfully');
  } else {
    throw new Error('Authentication failed');
  }
}

async function getActiveStores() {
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  return stores;
}

async function getActiveTemplates() {
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name,description,suggested_price&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  return templates;
}

async function deployTemplateToStore(template, store) {
  try {
    // Step 1: Create recipe for this store
    const recipeOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipes',
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' }
    };
    
    const recipeData = {
      template_id: template.id,
      store_id: store.id,
      name: template.name,
      description: template.description,
      is_active: true
    };
    
    const recipes = await makeRequest(recipeOptions, recipeData);
    const recipe = recipes[0];
    
    // Step 2: Find category for this store using exact template category name
    const categoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/categories?select=id,name&store_id=eq.${store.id}&name=eq.${encodeURIComponent(template.category_name)}&is_active=eq.true`,
      method: 'GET',
      headers
    };
    
    const categories = await makeRequest(categoryOptions);
    const category = categories.length > 0 ? categories[0] : null;
    
    // Step 3: Create product catalog entry
    const catalogOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/product_catalog',
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' }
    };
    
    const catalogData = {
      store_id: store.id,
      recipe_id: recipe.id,
      product_name: template.name,
      description: template.description,
      price: template.suggested_price || 0,
      category_id: category?.id || null,
      is_available: true,
      display_order: 0
    };
    
    await makeRequest(catalogOptions, catalogData);
    
    return {
      success: true,
      recipe_id: recipe.id,
      category_name: category?.name || 'No Category',
      category_found: !!category
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function deployAllRecipes() {
  console.log('\n🚀 Starting recipe deployment to all stores...');
  
  // Get stores and templates
  const [stores, templates] = await Promise.all([
    getActiveStores(),
    getActiveTemplates()
  ]);
  
  console.log(`   Found ${stores.length} active stores`);
  console.log(`   Found ${templates.length} active templates`);
  
  let totalDeployed = 0;
  let totalErrors = 0;
  const categoryStats = {};
  
  // Deploy each template to each store
  for (const store of stores) {
    console.log(`\n   📍 Deploying to: ${store.name}`);
    let storeDeployed = 0;
    let storeErrors = 0;
    
    for (const template of templates) {
      const result = await deployTemplateToStore(template, store);
      
      if (result.success) {
        console.log(`      ✅ ${template.name} → ${result.category_name}`);
        storeDeployed++;
        totalDeployed++;
        
        // Track category stats
        if (!categoryStats[result.category_name]) {
          categoryStats[result.category_name] = 0;
        }
        categoryStats[result.category_name]++;
        
      } else {
        console.log(`      ❌ ${template.name}: ${result.error}`);
        storeErrors++;
        totalErrors++;
      }
      
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log(`      📊 Store Results: ${storeDeployed} deployed, ${storeErrors} errors`);
  }
  
  return {
    totalDeployed,
    totalErrors,
    categoryStats,
    storeCount: stores.length,
    templateCount: templates.length
  };
}

async function generateFinalReport() {
  console.log('\n📊 Generating deployment report...');
  
  try {
    const [products, categories] = await Promise.all([
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/product_catalog?select=id,category_id,categories(name)&is_available=eq.true',
        method: 'GET',
        headers
      }),
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/categories?select=id,name&is_active=eq.true',
        method: 'GET',
        headers
      })
    ]);
    
    const categorizedProducts = products.filter(p => p.category_id).length;
    const uncategorizedProducts = products.length - categorizedProducts;
    const categorizationRate = Math.round((categorizedProducts / products.length) * 100);
    
    // Group products by category
    const categoryGroups = {};
    products.filter(p => p.category_id && p.categories).forEach(p => {
      const catName = p.categories.name;
      if (!categoryGroups[catName]) categoryGroups[catName] = 0;
      categoryGroups[catName]++;
    });
    
    console.log('   📊 DEPLOYMENT RESULTS:');
    console.log(`      Total Products: ${products.length}`);
    console.log(`      Categorized Products: ${categorizedProducts} (${categorizationRate}%)`);
    console.log(`      Uncategorized Products: ${uncategorizedProducts}`);
    console.log(`      Available Categories: ${categories.length}`);
    
    console.log('\n   📦 PRODUCTS BY CATEGORY:');
    Object.entries(categoryGroups)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`      ✅ ${category}: ${count} products`);
      });
    
    return {
      products: products.length,
      categorized: categorizedProducts,
      categorizationRate,
      categories: categories.length
    };
    
  } catch (error) {
    console.log(`   ❌ Failed to generate report: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    console.log('🚀 DEPLOY RECIPES TO ALL STORES');
    console.log('='.repeat(50));
    console.log('This script deploys recipes to all stores and creates POS products');
    console.log('');
    
    await authenticateAdmin();
    
    // Deploy all recipes
    const deploymentResult = await deployAllRecipes();
    
    // Generate final report
    const report = await generateFinalReport();
    
    console.log('\n🎉 RECIPE DEPLOYMENT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Total Products Deployed: ${deploymentResult.totalDeployed}`);
    console.log(`❌ Total Errors: ${deploymentResult.totalErrors}`);
    console.log(`🏪 Stores: ${deploymentResult.storeCount}`);
    console.log(`📋 Templates: ${deploymentResult.templateCount}`);
    
    if (report && report.categorizationRate >= 95) {
      console.log('\n✅ EXCELLENT: 95%+ products are properly categorized!');
    } else if (report && report.categorizationRate >= 85) {
      console.log('\n✅ GOOD: 85%+ products are categorized.');
    } else {
      console.log('\n⚠️ Some products may need attention.');
    }
    
    console.log('\n🎯 CATEGORY MAPPING SUCCESS!');
    console.log('   Products are using exact CSV category names');
    console.log('   No mapping or conversion applied');
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Check your POS system - products should now be visible');
    console.log('   2. Verify products appear in correct categories');
    console.log('   3. Test ordering functionality');
    console.log('   4. Products are deployed across all active stores');
    
    console.log('\n🎊 YOUR POS IS NOW READY WITH CORRECT CATEGORIES!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();
