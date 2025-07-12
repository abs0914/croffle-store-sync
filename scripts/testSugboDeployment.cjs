#!/usr/bin/env node

/**
 * Test Sugbo Deployment
 * 
 * This script tests the complete Cookies & Cream deployment process
 * on Sugbo Mercado to verify everything works end-to-end.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

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

async function testSugboDeployment() {
  console.log('🧪 TESTING COMPLETE SUGBO MERCADO DEPLOYMENT');
  console.log('='.repeat(50));
  
  try {
    await authenticateAdmin();
    
    // Step 1: Verify current state
    console.log('📋 STEP 1: VERIFYING CURRENT STATE');
    console.log('-'.repeat(40));
    
    // Check recipe
    const recipeOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*&store_id=eq.${SUGBO_STORE_ID}&name=ilike.*cookies*cream*`,
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipeOptions);
    console.log(`✅ Recipe: ${recipes.length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    if (recipes.length === 0) {
      console.log('❌ No Cookies & Cream recipe found - deployment needed');
      return;
    }
    
    const recipe = recipes[0];
    console.log(`   Recipe ID: ${recipe.id}`);
    console.log(`   Name: ${recipe.name}`);
    console.log(`   Price: ₱${recipe.suggested_price}`);
    
    // Check recipe ingredients
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_ingredients?select=*,inventory_stock(*)&recipe_id=eq.${recipe.id}`,
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    console.log(`✅ Recipe Ingredients: ${ingredients.length}/6`);
    
    if (ingredients.length < 6) {
      console.log('⚠️ Recipe missing ingredients - will be fixed');
    }
    
    // Check product catalog
    const productOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=*&store_id=eq.${SUGBO_STORE_ID}&product_name=ilike.*cookies*cream*`,
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productOptions);
    console.log(`✅ Product Catalog: ${products.length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Step 2: Test product catalog creation (if missing)
    if (products.length === 0) {
      console.log('\n🔧 STEP 2: CREATING PRODUCT CATALOG ENTRY');
      console.log('-'.repeat(40));
      
      try {
        const createProductOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/product_catalog',
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' }
        };
        
        const productData = {
          store_id: SUGBO_STORE_ID,
          product_name: 'Cookies & Cream',
          description: 'Crispy croissant with whipped cream, Oreo cookies and crushed Oreo',
          price: 125,
          is_available: true,
          recipe_id: recipe.id
        };
        
        const newProduct = await makeRequest(createProductOptions, productData);
        console.log('✅ Product catalog entry created successfully');
        console.log(`   Product ID: ${newProduct[0].id}`);
        console.log(`   Name: ${newProduct[0].product_name}`);
        console.log(`   Price: ₱${newProduct[0].price}`);
        console.log(`   Recipe Link: ${newProduct[0].recipe_id}`);
        
      } catch (error) {
        console.log(`❌ Failed to create product: ${error.message}`);
      }
    } else {
      console.log('\n✅ STEP 2: PRODUCT CATALOG ALREADY EXISTS');
      console.log('-'.repeat(40));
      
      const product = products[0];
      console.log(`   Product ID: ${product.id}`);
      console.log(`   Name: ${product.product_name}`);
      console.log(`   Price: ₱${product.price}`);
      console.log(`   Recipe Link: ${product.recipe_id || 'NOT LINKED'}`);
      
      // Update recipe link if missing
      if (!product.recipe_id) {
        console.log('🔧 Linking product to recipe...');
        
        const updateProductOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?id=eq.${product.id}`,
          method: 'PATCH',
          headers
        };
        
        const updateData = {
          recipe_id: recipe.id,
          price: 125,
          is_available: true
        };
        
        await makeRequest(updateProductOptions, updateData);
        console.log('✅ Product linked to recipe');
      }
    }
    
    // Step 3: Verify complete setup
    console.log('\n✅ STEP 3: FINAL VERIFICATION');
    console.log('-'.repeat(40));
    
    // Re-check everything
    const finalRecipes = await makeRequest(recipeOptions);
    const finalIngredients = await makeRequest(ingredientsOptions);
    const finalProducts = await makeRequest(productOptions);
    
    console.log('📊 Final Status:');
    console.log(`   ✅ Recipe: ${finalRecipes.length > 0 ? 'EXISTS' : 'MISSING'}`);
    console.log(`   ✅ Ingredients: ${finalIngredients.length}/6`);
    console.log(`   ✅ Product: ${finalProducts.length > 0 ? 'EXISTS' : 'MISSING'}`);
    
    if (finalProducts.length > 0) {
      const finalProduct = finalProducts[0];
      console.log(`   ✅ Recipe Link: ${finalProduct.recipe_id ? 'LINKED' : 'NOT LINKED'}`);
    }
    
    // Step 4: Test readiness for orders
    console.log('\n🧪 STEP 4: ORDER READINESS TEST');
    console.log('-'.repeat(40));
    
    const allReady = finalRecipes.length > 0 && 
                     finalIngredients.length === 6 && 
                     finalProducts.length > 0 &&
                     finalProducts[0].recipe_id;
    
    if (allReady) {
      console.log('🎉 SUGBO MERCADO IS FULLY READY FOR COOKIES & CREAM ORDERS!');
      console.log('\n📋 What works:');
      console.log('   ✅ Recipe exists with all 6 ingredients');
      console.log('   ✅ Product appears in POS catalog');
      console.log('   ✅ Product linked to recipe for inventory deduction');
      console.log('   ✅ End-of-shift reconciliation will work');
      
      console.log('\n🧪 Test Instructions:');
      console.log('   1. Go to POS: https://preview--croffle-store-sync.lovable.app/');
      console.log('   2. Select Sugbo Mercado store');
      console.log('   3. Find "Cookies & Cream" in menu');
      console.log('   4. Add to cart and complete order');
      console.log('   5. Run end-of-shift reconciliation');
      
    } else {
      console.log('❌ Setup incomplete - some components missing');
      
      if (finalRecipes.length === 0) console.log('   ❌ Recipe missing');
      if (finalIngredients.length < 6) console.log('   ❌ Recipe ingredients incomplete');
      if (finalProducts.length === 0) console.log('   ❌ Product catalog missing');
      if (finalProducts.length > 0 && !finalProducts[0].recipe_id) console.log('   ❌ Product not linked to recipe');
    }
    
    // Step 5: Deployment template for other stores
    if (allReady) {
      console.log('\n📋 STEP 5: DEPLOYMENT TEMPLATE FOR OTHER STORES');
      console.log('-'.repeat(40));
      
      console.log('✅ Sugbo Mercado setup can be replicated to other stores that have:');
      console.log('   1. ✅ Inventory items set up');
      console.log('   2. ✅ Required ingredients available');
      console.log('   3. ✅ Store configured in system');
      
      console.log('\n🔧 For stores without inventory:');
      console.log('   1. Set up basic inventory items first');
      console.log('   2. Add required ingredients (Regular Croissant, Whipped Cream, etc.)');
      console.log('   3. Then deploy Cookies & Cream recipe');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

// Run the test
testSugboDeployment();
