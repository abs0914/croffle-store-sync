#!/usr/bin/env node

/**
 * Deploy Cookies & Cream Croffle to All Stores
 * 
 * This script deploys the complete Cookies & Cream Croffle recipe
 * (with all 6 ingredients) to all remaining stores in the system.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Sugbo Mercado (reference store - already working)
const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// Cookies & Cream recipe ingredients (from successful Sugbo setup)
const RECIPE_INGREDIENTS = [
  { name: 'REGULAR CROISSANT', quantity: 1, unit: 'pieces', cost: 30 },
  { name: 'WHIPPED CREAM', quantity: 1, unit: 'pieces', cost: 8 },
  { name: 'Oreo Crushed', quantity: 1, unit: 'pieces', cost: 2.5 },
  { name: 'Oreo Cookies', quantity: 1, unit: 'pieces', cost: 2.9 },
  { name: 'Chopstick', quantity: 1, unit: 'pieces', cost: 0.6 },
  { name: 'Wax Paper', quantity: 1, unit: 'pieces', cost: 0.7 }
];

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

async function deployCookiesCreamToAllStores() {
  console.log('🚀 DEPLOYING COOKIES & CREAM CROFFLE TO ALL STORES');
  console.log('='.repeat(60));
  
  try {
    await authenticateAdmin();
    
    // Step 1: Get all stores
    console.log('🏪 STEP 1: GETTING ALL STORES');
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
    
    // Filter out Sugbo Mercado (already deployed)
    const targetStores = stores.filter(store => store.id !== SUGBO_STORE_ID);
    console.log(`📋 Target stores for deployment: ${targetStores.length}`);
    
    targetStores.forEach(store => {
      console.log(`   - ${store.name} (${store.location})`);
    });
    
    // Step 2: Get Cookies & Cream template from Sugbo
    console.log('\n📋 STEP 2: GETTING REFERENCE TEMPLATE');
    console.log('-'.repeat(40));
    
    const templateOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*&name=ilike.*cookies*cream*',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templateOptions);
    
    if (templates.length === 0) {
      console.log('❌ Cookies & Cream template not found');
      return;
    }
    
    const template = templates[0];
    console.log(`✅ Found template: ${template.name} (ID: ${template.id})`);
    console.log(`   Category: ${template.category_name || template.category}`);
    console.log(`   Price: ₱${template.suggested_price}`);
    
    // Step 3: Deploy to each store
    console.log('\n🚀 STEP 3: DEPLOYING TO EACH STORE');
    console.log('-'.repeat(40));
    
    const deploymentResults = [];
    
    for (const store of targetStores) {
      console.log(`\n🏪 Deploying to ${store.name}...`);
      
      try {
        // Check if recipe already exists
        const existingRecipeOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipes?select=*&store_id=eq.${store.id}&name=ilike.*cookies*cream*`,
          method: 'GET',
          headers
        };
        
        const existingRecipes = await makeRequest(existingRecipeOptions);
        
        let recipeId;
        
        if (existingRecipes.length > 0) {
          recipeId = existingRecipes[0].id;
          console.log(`   ✅ Recipe already exists (ID: ${recipeId})`);
        } else {
          // Create new recipe
          const newRecipeOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: '/rest/v1/recipes',
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=representation' }
          };
          
          const recipeData = {
            template_id: template.id,
            store_id: store.id,
            name: 'Cookies & Cream',
            description: template.description,
            suggested_price: 125,
            is_active: true,
            recipe_type: 'single'
          };
          
          const newRecipe = await makeRequest(newRecipeOptions, recipeData);
          recipeId = newRecipe[0].id;
          console.log(`   ✅ Created new recipe (ID: ${recipeId})`);
        }
        
        // Get store inventory for ingredient mapping
        const inventoryOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}`,
          method: 'GET',
          headers
        };
        
        const inventory = await makeRequest(inventoryOptions);
        console.log(`   📦 Found ${inventory.length} inventory items`);
        
        // Create inventory mapping
        const inventoryMap = {};
        inventory.forEach(item => {
          const itemName = item.item.toLowerCase();
          inventoryMap[itemName] = item.id;
        });
        
        // Clear existing ingredients
        const deleteIngredientsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_ingredients?recipe_id=eq.${recipeId}`,
          method: 'DELETE',
          headers
        };
        
        await makeRequest(deleteIngredientsOptions);
        
        // Add recipe ingredients
        let ingredientCount = 0;
        let missingIngredients = [];
        
        for (const ingredient of RECIPE_INGREDIENTS) {
          const inventoryItemId = inventoryMap[ingredient.name.toLowerCase()];
          
          if (!inventoryItemId) {
            missingIngredients.push(ingredient.name);
            continue;
          }
          
          const ingredientData = {
            recipe_id: recipeId,
            inventory_stock_id: inventoryItemId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            ingredient_name: ingredient.name,
            cost_per_unit: ingredient.cost,
            notes: 'Auto-deployed from template'
          };
          
          const addIngredientOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: '/rest/v1/recipe_ingredients',
            method: 'POST',
            headers
          };
          
          await makeRequest(addIngredientOptions, ingredientData);
          ingredientCount++;
        }
        
        console.log(`   ✅ Added ${ingredientCount}/${RECIPE_INGREDIENTS.length} ingredients`);
        
        if (missingIngredients.length > 0) {
          console.log(`   ⚠️ Missing inventory items: ${missingIngredients.join(', ')}`);
        }
        
        // Check/create product catalog entry
        const productOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&product_name=ilike.*cookies*cream*`,
          method: 'GET',
          headers
        };
        
        const products = await makeRequest(productOptions);
        
        if (products.length === 0) {
          // Create product catalog entry
          const newProductOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: '/rest/v1/product_catalog',
            method: 'POST',
            headers
          };
          
          const productData = {
            store_id: store.id,
            product_name: 'Cookies & Cream',
            description: 'Crispy croissant with whipped cream, Oreo cookies and crushed Oreo',
            price: 125,
            is_available: true,
            recipe_id: recipeId
          };
          
          await makeRequest(newProductOptions, productData);
          console.log(`   ✅ Created product catalog entry`);
        } else {
          // Update existing product to link to recipe
          const updateProductOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/product_catalog?id=eq.${products[0].id}`,
            method: 'PATCH',
            headers
          };
          
          const updateData = {
            recipe_id: recipeId,
            price: 125,
            is_available: true
          };
          
          await makeRequest(updateProductOptions, updateData);
          console.log(`   ✅ Updated existing product catalog entry`);
        }
        
        deploymentResults.push({
          store: store.name,
          storeId: store.id,
          success: true,
          recipeId: recipeId,
          ingredientCount: ingredientCount,
          missingIngredients: missingIngredients
        });
        
        console.log(`   🎉 ${store.name} deployment completed!`);
        
      } catch (error) {
        console.log(`   ❌ ${store.name} deployment failed: ${error.message}`);
        deploymentResults.push({
          store: store.name,
          storeId: store.id,
          success: false,
          error: error.message
        });
      }
    }
    
    // Step 4: Deployment summary
    console.log('\n📊 STEP 4: DEPLOYMENT SUMMARY');
    console.log('='.repeat(60));
    
    const successfulDeployments = deploymentResults.filter(r => r.success);
    const failedDeployments = deploymentResults.filter(r => !r.success);
    
    console.log(`✅ Successful deployments: ${successfulDeployments.length}`);
    console.log(`❌ Failed deployments: ${failedDeployments.length}`);
    console.log(`📦 Total stores processed: ${deploymentResults.length}`);
    
    if (successfulDeployments.length > 0) {
      console.log('\n✅ SUCCESSFUL DEPLOYMENTS:');
      successfulDeployments.forEach(result => {
        console.log(`   🏪 ${result.store}:`);
        console.log(`      Recipe ID: ${result.recipeId}`);
        console.log(`      Ingredients: ${result.ingredientCount}/${RECIPE_INGREDIENTS.length}`);
        if (result.missingIngredients.length > 0) {
          console.log(`      Missing: ${result.missingIngredients.join(', ')}`);
        }
      });
    }
    
    if (failedDeployments.length > 0) {
      console.log('\n❌ FAILED DEPLOYMENTS:');
      failedDeployments.forEach(result => {
        console.log(`   🏪 ${result.store}: ${result.error}`);
      });
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Test deployment on one additional store');
    console.log('2. Verify POS catalog shows Cookies & Cream');
    console.log('3. Test end-of-shift reconciliation');
    console.log('4. Deploy to remaining stores if test successful');
    
  } catch (error) {
    console.error('❌ Error during deployment:', error.message);
  }
}

// Run the deployment
deployCookiesCreamToAllStores();
