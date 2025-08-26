#!/usr/bin/env node

/**
 * Fix Tiramisu Pricing Script
 * 
 * This script fixes the pricing issue for the Tiramisu recipe and ensures
 * it appears correctly in the product catalog.
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
        try {
          const result = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function authenticate() {
  console.log('🔐 Authenticating...');
  
  const options = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const result = await makeRequest(options, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  console.log('✅ Authentication successful');
  return {
    accessToken: result.access_token,
    userId: result.user.id
  };
}

async function fixTiramisuPricing() {
  console.log('🔧 Fixing Tiramisu pricing and product catalog issues...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Step 1: Find Tiramisu recipe templates
  console.log('🔍 Finding Tiramisu recipe templates...');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=*&name=ilike.*Tiramisu*',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  console.log(`✅ Found ${templates.length} Tiramisu templates`);
  
  for (const template of templates) {
    console.log(`\n📋 Processing template: ${template.name} (${template.category_name})`);
    
    // Step 2: Find deployed recipes for this template
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*,stores(name)&template_id=eq.${template.id}`,
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    console.log(`   Found ${recipes.length} deployed recipes`);
    
    for (const recipe of recipes) {
      const storeName = recipe.stores?.name || 'Unknown Store';
      console.log(`   📍 Recipe in ${storeName}: ₱${recipe.suggested_price}`);
      
      // Step 3: Check if this is a Classic Tiramisu (should be ₱125)
      if (template.category_name === 'classic' || template.category_name === 'Classic') {
        const correctPrice = 125;
        
        if (recipe.suggested_price !== correctPrice) {
          console.log(`   🔧 Fixing price from ₱${recipe.suggested_price} to ₱${correctPrice}`);
          
          // Update recipe price
          const updateRecipeOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/recipes?id=eq.${recipe.id}`,
            method: 'PATCH',
            headers
          };
          
          await makeRequest(updateRecipeOptions, {
            suggested_price: correctPrice
          });
          
          console.log(`   ✅ Updated recipe price to ₱${correctPrice}`);
        }
        
        // Step 4: Check product catalog entry
        const catalogOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?select=*&recipe_id=eq.${recipe.id}`,
          method: 'GET',
          headers
        };
        
        const catalogEntries = await makeRequest(catalogOptions);
        
        if (catalogEntries.length === 0) {
          console.log(`   🛍️ Creating missing product catalog entry...`);
          
          // Create product catalog entry
          const createCatalogOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: '/rest/v1/product_catalog',
            method: 'POST',
            headers
          };
          
          const catalogResult = await makeRequest(createCatalogOptions, {
            store_id: recipe.store_id,
            product_name: recipe.name,
            description: recipe.description || template.description || '',
            price: correctPrice,
            is_available: true,
            recipe_id: recipe.id,
            image_url: template.image_url || null,
            display_order: 0
          });
          
          console.log(`   ✅ Created product catalog entry: ${catalogResult[0]?.id}`);
          
          // Update recipe with product_id
          const updateRecipeWithProductOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/recipes?id=eq.${recipe.id}`,
            method: 'PATCH',
            headers
          };
          
          await makeRequest(updateRecipeWithProductOptions, {
            product_id: catalogResult[0]?.id
          });
          
          console.log(`   ✅ Linked recipe to product catalog`);
          
        } else {
          const catalogEntry = catalogEntries[0];
          console.log(`   📦 Product catalog entry exists: ₱${catalogEntry.price}`);
          
          if (catalogEntry.price !== correctPrice) {
            console.log(`   🔧 Fixing catalog price from ₱${catalogEntry.price} to ₱${correctPrice}`);
            
            const updateCatalogOptions = {
              hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
              port: 443,
              path: `/rest/v1/product_catalog?id=eq.${catalogEntry.id}`,
              method: 'PATCH',
              headers
            };
            
            await makeRequest(updateCatalogOptions, {
              price: correctPrice,
              is_available: true
            });
            
            console.log(`   ✅ Updated catalog price to ₱${correctPrice}`);
          }
        }
      }
    }
  }
  
  console.log('\n✅ Tiramisu pricing fix complete!');
  console.log('💡 Please refresh the Product Catalog and POS to see the changes.');
}

fixTiramisuPricing().catch(console.error);
