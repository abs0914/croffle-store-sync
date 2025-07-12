#!/usr/bin/env node

/**
 * Check Sugbo Mercado Specific Data
 * 
 * This script specifically checks Sugbo Mercado for deployed recipes and products.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Store IDs
const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
const ROBINSONS_NORTH_ID = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

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
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
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
    console.log('✅ Admin authentication successful');
    
    // Update headers with the access token
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    
    return authResult;
  } catch (error) {
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function checkOreoDeployment() {
  console.log('🍪 Checking Oreo Cookies Deployment to Both Stores\n');
  
  try {
    // Try to authenticate first
    await authenticateAdmin();
    
    // Step 1: Verify both target stores
    console.log('📍 Step 1: Verifying target stores...');
    const storeOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/stores?select=*&id=in.(${SUGBO_STORE_ID},${ROBINSONS_NORTH_ID})`,
      method: 'GET',
      headers
    };

    const stores = await makeRequest(storeOptions);

    const sugboStore = stores.find(s => s.id === SUGBO_STORE_ID);
    const robinsonsStore = stores.find(s => s.id === ROBINSONS_NORTH_ID);

    if (!sugboStore) {
      console.log('❌ Sugbo Mercado store not found');
      return;
    }

    if (!robinsonsStore) {
      console.log('❌ Robinsons North store not found');
      return;
    }

    console.log(`✅ Sugbo Mercado: ${sugboStore.name} (Active: ${sugboStore.is_active})`);
    console.log(`✅ Robinsons North: ${robinsonsStore.name} (Active: ${robinsonsStore.is_active})`);
    
    // Step 2: Check Oreo/Cookies recipes in both stores
    console.log('\n🍽️ Step 2: Checking Oreo/Cookies recipes in both stores...');
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*&store_id=in.(${SUGBO_STORE_ID},${ROBINSONS_NORTH_ID})`,
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    console.log(`✅ Found ${recipes.length} total recipes in both stores`);

    // Filter for Oreo/Cookies recipes
    const oreoRecipes = recipes.filter(r =>
      r.name.toLowerCase().includes('cookies') ||
      r.name.toLowerCase().includes('oreo') ||
      r.name.toLowerCase().includes('cream')
    );

    console.log(`\n🍪 Oreo/Cookies Recipes Found: ${oreoRecipes.length}`);

    const sugboOreoRecipes = oreoRecipes.filter(r => r.store_id === SUGBO_STORE_ID);
    const robinsonsOreoRecipes = oreoRecipes.filter(r => r.store_id === ROBINSONS_NORTH_ID);

    console.log(`\n📊 Sugbo Mercado (${sugboOreoRecipes.length} Oreo recipes):`);
    sugboOreoRecipes.forEach(recipe => {
      console.log(`   ✅ ${recipe.name} (ID: ${recipe.id})`);
      console.log(`      Price: ₱${recipe.suggested_price || 'N/A'}, Active: ${recipe.is_active}`);
    });

    console.log(`\n📊 Robinsons North (${robinsonsOreoRecipes.length} Oreo recipes):`);
    robinsonsOreoRecipes.forEach(recipe => {
      console.log(`   ✅ ${recipe.name} (ID: ${recipe.id})`);
      console.log(`      Price: ₱${recipe.suggested_price || 'N/A'}, Active: ${recipe.is_active}`);
    });
    
    // Step 3: Check product catalog in both stores
    console.log('\n🛍️ Step 3: Checking product catalog in both stores...');
    const productsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=*&store_id=in.(${SUGBO_STORE_ID},${ROBINSONS_NORTH_ID})`,
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productsOptions);
    console.log(`✅ Found ${products.length} total products in both stores`);

    // Filter for Oreo/Cookies products
    const oreoProducts = products.filter(p =>
      p.product_name.toLowerCase().includes('cookies') ||
      p.product_name.toLowerCase().includes('oreo') ||
      p.product_name.toLowerCase().includes('cream')
    );

    console.log(`\n🍪 Oreo/Cookies Products Found: ${oreoProducts.length}`);

    const sugboOreoProducts = oreoProducts.filter(p => p.store_id === SUGBO_STORE_ID);
    const robinsonsOreoProducts = oreoProducts.filter(p => p.store_id === ROBINSONS_NORTH_ID);

    console.log(`\n📊 Sugbo Mercado (${sugboOreoProducts.length} Oreo products):`);
    sugboOreoProducts.forEach(product => {
      console.log(`   ✅ ${product.product_name} - ₱${product.price} (Available: ${product.is_available})`);
    });

    console.log(`\n📊 Robinsons North (${robinsonsOreoProducts.length} Oreo products):`);
    robinsonsOreoProducts.forEach(product => {
      console.log(`   ✅ ${product.product_name} - ₱${product.price} (Available: ${product.is_available})`);
    });
    
    // Step 4: Check recipe templates (all)
    console.log('\n📋 Step 4: Checking all recipe templates...');
    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templatesOptions);
    console.log(`✅ Found ${templates.length} recipe templates total:`);
    
    if (templates.length > 0) {
      // Look for Oreo/Cookies templates
      const oreoTemplates = templates.filter(t => 
        t.name.toLowerCase().includes('cookies') || 
        t.name.toLowerCase().includes('oreo') ||
        t.name.toLowerCase().includes('cream')
      );
      
      if (oreoTemplates.length > 0) {
        console.log(`🍪 Found ${oreoTemplates.length} Oreo/Cookies templates:`);
        oreoTemplates.forEach(template => {
          console.log(`   ✅ ${template.name} (ID: ${template.id})`);
          console.log(`      Category: ${template.category_name || template.category || 'N/A'}`);
          console.log(`      Price: ₱${template.suggested_price}`);
          console.log(`      Active: ${template.is_active}`);
        });
      } else {
        console.log('   ⚠️ No Oreo/Cookies templates found');
        console.log('   Available templates:');
        templates.slice(0, 10).forEach(t => {
          console.log(`     - ${t.name} (${t.category_name || t.category || 'No category'})`);
        });
        if (templates.length > 10) {
          console.log(`     ... and ${templates.length - 10} more`);
        }
      }
    }
    
    // Step 5: Check deployment records for Sugbo
    console.log('\n📊 Step 5: Checking deployment records for Sugbo Mercado...');
    const deploymentsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_deployments?select=*&store_id=eq.${SUGBO_STORE_ID}&order=created_at.desc`,
      method: 'GET',
      headers
    };
    
    const deployments = await makeRequest(deploymentsOptions);
    console.log(`✅ Found ${deployments.length} deployment records for Sugbo Mercado:`);
    
    if (deployments.length > 0) {
      deployments.forEach((deployment, index) => {
        console.log(`   ${index + 1}. ${deployment.created_at}`);
        console.log(`      Template ID: ${deployment.template_id}`);
        console.log(`      Recipe ID: ${deployment.recipe_id}`);
        console.log(`      Status: ${deployment.deployment_status}`);
        console.log(`      Cost: ₱${deployment.cost_snapshot || 'N/A'}`);
        console.log(`      Price: ₱${deployment.price_snapshot || 'N/A'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking Sugbo Mercado:', error.message);
  }
}

// Run the check
checkOreoDeployment();
