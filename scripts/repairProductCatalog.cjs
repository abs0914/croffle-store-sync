#!/usr/bin/env node

/**
 * Repair Missing Product Catalog Entries
 * 
 * This script fixes the issue where recipes are deployed but missing from product_catalog,
 * causing them not to appear in the POS system.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}, Response: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
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

async function authenticate() {
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  return await makeRequest(authOptions, authData);
}

async function repairProductCatalog() {
  console.log('🔧 Starting repair of missing product catalog entries...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.access_token}`,
    'Content-Type': 'application/json'
  };
  
  // Step 1: Find recipes missing from product catalog
  console.log('🔍 Finding recipes missing from product catalog...');
  const missingRecipesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipes?select=id,name,store_id,total_cost,suggested_price,description,template_id,recipe_templates(category_name,image_url),stores(name)&is_active=eq.true&approval_status=eq.approved',
    method: 'GET',
    headers
  };
  
  const allRecipes = await makeRequest(missingRecipesOptions);
  console.log(`✅ Found ${allRecipes.length} active recipes`);
  
  // Step 2: Check which ones are missing from product catalog
  const catalogOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=recipe_id',
    method: 'GET',
    headers
  };
  
  const catalogEntries = await makeRequest(catalogOptions);
  const existingRecipeIds = new Set(catalogEntries.map(entry => entry.recipe_id).filter(Boolean));
  
  const missingRecipes = allRecipes.filter(recipe => !existingRecipeIds.has(recipe.id));
  console.log(`🔍 Found ${missingRecipes.length} recipes missing from product catalog:`);
  
  missingRecipes.forEach(recipe => {
    console.log(`   - ${recipe.name} in ${recipe.stores?.name || 'Unknown Store'}`);
  });
  
  if (missingRecipes.length === 0) {
    console.log('✅ No missing product catalog entries found!');
    return;
  }
  
  // Step 3: Create missing product catalog entries
  console.log('\n🛍️ Creating missing product catalog entries...');
  let successCount = 0;
  let errorCount = 0;
  
  for (const recipe of missingRecipes) {
    try {
      const price = recipe.suggested_price || recipe.total_cost * 1.5 || 125;
      
      console.log(`   🔄 Creating: ${recipe.name} - ₱${price}`);
      
      const createProductOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/product_catalog',
        method: 'POST',
        headers
      };
      
      const productData = {
        store_id: recipe.store_id,
        product_name: recipe.name,
        description: recipe.description || `Delicious ${recipe.name} made fresh to order`,
        price: price,
        is_available: true,
        recipe_id: recipe.id,
        image_url: recipe.recipe_templates?.image_url || null,
        display_order: 0
      };
      
      await makeRequest(createProductOptions, productData);
      console.log(`   ✅ Created: ${recipe.name}`);
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Failed to create ${recipe.name}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n🎉 Repair completed!`);
  console.log(`   ✅ Successfully created: ${successCount} products`);
  console.log(`   ❌ Failed to create: ${errorCount} products`);
  
  if (successCount > 0) {
    console.log('\n📱 Products should now appear in the POS system!');
  }
}

repairProductCatalog().catch(console.error);
