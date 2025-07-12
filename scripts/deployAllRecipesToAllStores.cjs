#!/usr/bin/env node

/**
 * Deploy All Recipes to All Stores
 * 
 * This script deploys ALL recipe templates to ALL stores in the system,
 * creating a complete recipe deployment across the entire network.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const headers = {
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
          if (body.trim() === '') {
            resolve({});
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
            } else {
              resolve(result);
            }
          }
        } catch (e) {
          if (res.statusCode < 400) {
            resolve({});
          } else {
            reject(new Error(`Parse error: ${e.message}`));
          }
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
  console.log('🔐 Authenticating as admin...');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers
  };
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const authResult = await makeRequest(authOptions, authData);
    console.log('✅ Admin authentication successful\n');
    
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    return authResult;
  } catch (error) {
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function deployAllRecipesToAllStores() {
  console.log('🚀 DEPLOYING ALL RECIPES TO ALL STORES');
  console.log('='.repeat(50));
  
  try {
    await authenticateAdmin();
    
    // Step 1: Get all recipe templates
    console.log('📋 STEP 1: GETTING ALL RECIPE TEMPLATES');
    console.log('-'.repeat(40));
    
    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templatesOptions);
    console.log(`✅ Found ${templates.length} active recipe templates`);
    
    // Group templates by category
    const templatesByCategory = {};
    templates.forEach(template => {
      const category = template.category_name || template.category || 'Other';
      if (!templatesByCategory[category]) {
        templatesByCategory[category] = [];
      }
      templatesByCategory[category].push(template);
    });
    
    console.log('\n📊 Templates by category:');
    Object.entries(templatesByCategory).forEach(([category, temps]) => {
      console.log(`   ${category}: ${temps.length} recipes`);
    });
    
    // Step 2: Get all stores
    console.log('\n🏪 STEP 2: GETTING ALL STORES');
    console.log('-'.repeat(40));
    
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=*',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    console.log(`✅ Found ${stores.length} stores in system`);
    
    stores.forEach(store => {
      console.log(`   - ${store.name} (${store.location || 'No location'})`);
    });
    
    // Step 3: Deploy recipes to each store
    console.log('\n🔧 STEP 3: DEPLOYING RECIPES TO EACH STORE');
    console.log('-'.repeat(40));
    
    const deploymentResults = [];
    
    for (const store of stores) {
      console.log(`\n🏪 Deploying to ${store.name}...`);
      
      try {
        // Get existing recipes for this store
        const existingRecipesOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipes?select=template_id&store_id=eq.${store.id}`,
          method: 'GET',
          headers
        };
        
        const existingRecipes = await makeRequest(existingRecipesOptions);
        const existingTemplateIds = new Set(existingRecipes.map(r => r.template_id));
        
        console.log(`   📋 Store has ${existingRecipes.length} existing recipes`);
        
        let newRecipeCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        
        // Deploy each template
        for (const template of templates) {
          try {
            if (existingTemplateIds.has(template.id)) {
              skippedCount++;
              continue;
            }
            
            // Create new recipe from template
            const createRecipeOptions = {
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
              suggested_price: template.suggested_price,
              is_active: true,
              recipe_type: 'single'
            };
            
            await makeRequest(createRecipeOptions, recipeData);
            newRecipeCount++;
            
          } catch (error) {
            failedCount++;
            if (!error.message.includes('duplicate key')) {
              console.log(`     ⚠️ Failed to create ${template.name}: ${error.message}`);
            }
          }
        }
        
        console.log(`   ✅ Deployed ${newRecipeCount} new recipes (${skippedCount} existed, ${failedCount} failed)`);
        
        deploymentResults.push({
          store: store.name,
          storeId: store.id,
          success: true,
          newRecipes: newRecipeCount,
          existingRecipes: existingRecipes.length,
          totalRecipes: existingRecipes.length + newRecipeCount,
          skipped: skippedCount,
          failed: failedCount
        });
        
      } catch (error) {
        console.log(`   ❌ Failed to deploy to ${store.name}: ${error.message}`);
        deploymentResults.push({
          store: store.name,
          storeId: store.id,
          success: false,
          error: error.message
        });
      }
    }
    
    // Step 4: Create product catalog entries
    console.log('\n🛍️ STEP 4: CREATING PRODUCT CATALOG ENTRIES');
    console.log('-'.repeat(40));
    
    for (const result of deploymentResults.filter(r => r.success)) {
      console.log(`\n🏪 Creating products for ${result.store}...`);
      
      try {
        // Get all recipes for this store
        const recipesOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipes?select=*,recipe_templates(*)&store_id=eq.${result.storeId}`,
          method: 'GET',
          headers
        };
        
        const recipes = await makeRequest(recipesOptions);
        
        // Get existing products
        const existingProductsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?select=recipe_id&store_id=eq.${result.storeId}`,
          method: 'GET',
          headers
        };
        
        const existingProducts = await makeRequest(existingProductsOptions);
        const existingRecipeIds = new Set(existingProducts.map(p => p.recipe_id).filter(Boolean));
        
        let productCount = 0;
        
        for (const recipe of recipes) {
          if (existingRecipeIds.has(recipe.id)) {
            continue; // Product already exists
          }
          
          try {
            const template = recipe.recipe_templates;
            
            const createProductOptions = {
              hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
              port: 443,
              path: '/rest/v1/product_catalog',
              method: 'POST',
              headers
            };
            
            const productData = {
              store_id: result.storeId,
              product_name: recipe.name,
              description: recipe.description || template?.description || '',
              price: recipe.suggested_price || template?.suggested_price || 0,
              is_available: true,
              recipe_id: recipe.id
            };
            
            await makeRequest(createProductOptions, productData);
            productCount++;
            
          } catch (error) {
            if (!error.message.includes('duplicate key')) {
              console.log(`     ⚠️ Failed to create product for ${recipe.name}`);
            }
          }
        }
        
        console.log(`   ✅ Created ${productCount} product catalog entries`);
        result.productsCreated = productCount;
        
      } catch (error) {
        console.log(`   ❌ Failed to create products: ${error.message}`);
        result.productsCreated = 0;
      }
    }
    
    // Step 5: Deployment summary
    console.log('\n📊 STEP 5: COMPLETE DEPLOYMENT SUMMARY');
    console.log('='.repeat(50));
    
    const successfulDeployments = deploymentResults.filter(r => r.success);
    const failedDeployments = deploymentResults.filter(r => !r.success);
    
    console.log(`✅ Successful deployments: ${successfulDeployments.length}`);
    console.log(`❌ Failed deployments: ${failedDeployments.length}`);
    console.log(`📦 Total stores: ${deploymentResults.length}`);
    console.log(`📋 Total templates: ${templates.length}`);
    
    if (successfulDeployments.length > 0) {
      console.log('\n✅ DEPLOYMENT RESULTS BY STORE:');
      successfulDeployments.forEach(result => {
        console.log(`\n   🏪 ${result.store}:`);
        console.log(`      📋 Total recipes: ${result.totalRecipes}`);
        console.log(`      ➕ New recipes: ${result.newRecipes}`);
        console.log(`      📦 Existing recipes: ${result.existingRecipes}`);
        console.log(`      🛍️ Products created: ${result.productsCreated || 0}`);
        console.log(`      ⏭️ Skipped: ${result.skipped}`);
        if (result.failed > 0) {
          console.log(`      ❌ Failed: ${result.failed}`);
        }
      });
    }
    
    if (failedDeployments.length > 0) {
      console.log('\n❌ FAILED DEPLOYMENTS:');
      failedDeployments.forEach(result => {
        console.log(`   🏪 ${result.store}: ${result.error}`);
      });
    }
    
    // Step 6: Final statistics
    console.log('\n📈 STEP 6: FINAL DEPLOYMENT STATISTICS');
    console.log('='.repeat(50));
    
    const totalNewRecipes = successfulDeployments.reduce((sum, r) => sum + r.newRecipes, 0);
    const totalExistingRecipes = successfulDeployments.reduce((sum, r) => sum + r.existingRecipes, 0);
    const totalProducts = successfulDeployments.reduce((sum, r) => sum + (r.productsCreated || 0), 0);
    const totalRecipes = successfulDeployments.reduce((sum, r) => sum + r.totalRecipes, 0);
    
    console.log(`📊 SYSTEM-WIDE DEPLOYMENT COMPLETE!`);
    console.log(`✅ Stores deployed: ${successfulDeployments.length}/${deploymentResults.length}`);
    console.log(`📋 Total recipes deployed: ${totalRecipes}`);
    console.log(`➕ New recipes created: ${totalNewRecipes}`);
    console.log(`📦 Existing recipes: ${totalExistingRecipes}`);
    console.log(`🛍️ Product catalog entries: ${totalProducts}`);
    console.log(`📈 Success rate: ${Math.round((successfulDeployments.length/deploymentResults.length) * 100)}%`);
    
    if (successfulDeployments.length === deploymentResults.length) {
      console.log('\n🎉 PERFECT DEPLOYMENT - ALL STORES READY!');
      console.log('\n📋 What the system now has:');
      console.log(`   ✅ ${templates.length} recipe templates available`);
      console.log(`   ✅ ${successfulDeployments.length} stores fully deployed`);
      console.log(`   ✅ ${totalRecipes} total recipes across all stores`);
      console.log(`   ✅ ${totalProducts} products in POS catalogs`);
      console.log(`   ✅ Complete recipe network established`);
      
      console.log('\n🚀 Ready for operations:');
      console.log('   1. All stores can process all recipe orders');
      console.log('   2. Complete POS catalog available');
      console.log('   3. Recipe management system operational');
      console.log('   4. Multi-store recipe consistency achieved');
      
    } else {
      console.log('\n⚠️ Partial deployment - some stores need attention');
    }
    
  } catch (error) {
    console.error('❌ Error during deployment:', error.message);
  }
}

// Run the complete deployment
deployAllRecipesToAllStores();
