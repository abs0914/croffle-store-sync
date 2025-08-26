#!/usr/bin/env node

/**
 * Test POS API Script
 * 
 * This script tests what the POS API endpoints are returning.
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
          resolve(result);
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

async function testPOSAPI() {
  console.log('🔍 Testing POS API endpoints...\n');
  
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
  
  const authResult = await makeRequest(authOptions, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${authResult.access_token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔐 Authenticated as admin user');
  
  // Check app_users to see which store the admin is associated with
  console.log('\n👤 Checking admin user store association:');
  const userOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/app_users?select=*&user_id=eq.${authResult.user.id}`,
    method: 'GET',
    headers
  };
  
  const users = await makeRequest(userOptions);
  if (users.length > 0) {
    const user = users[0];
    console.log(`✅ Admin user found:`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Store IDs: ${JSON.stringify(user.store_ids)}`);
    console.log(`   First store (default): ${user.store_ids[0]}`);
    
    // Get the first store details
    if (user.store_ids.length > 0) {
      const firstStoreId = user.store_ids[0];
      const storeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/stores?select=*&id=eq.${firstStoreId}`,
        method: 'GET',
        headers
      };
      
      const stores = await makeRequest(storeOptions);
      if (stores.length > 0) {
        console.log(`   Default store: ${stores[0].name}`);
      }
    }
  } else {
    console.log('❌ Admin user not found in app_users');
  }
  
  // Test the product catalog API for each store
  console.log('\n📦 Testing product catalog API for all stores:');
  
  const allStoresOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name',
    method: 'GET',
    headers
  };
  
  const allStores = await makeRequest(allStoresOptions);
  
  for (const store of allStores) {
    console.log(`\n🏪 Store: ${store.name} (${store.id})`);
    
    // Test product catalog endpoint
    const catalogOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=*,ingredients:product_ingredients(*,inventory_item:inventory_stock(*)),category:categories(id,name),recipes(template_id,recipe_templates(category_name))&store_id=eq.${store.id}&is_available=eq.true&order=display_order`,
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(catalogOptions);
    console.log(`   📦 Products: ${Array.isArray(products) ? products.length : 'Error - not an array'}`);

    if (Array.isArray(products)) {
      products.forEach(product => {
        const templateCategory = product.recipes?.recipe_templates?.category_name || 'none';
        const categoryName = product.category?.name || 'uncategorized';
        console.log(`      - ${product.product_name}: template="${templateCategory}", category="${categoryName}"`);
      });
    } else {
      console.log(`      Error: ${JSON.stringify(products)}`);
    }
    
    // Test categories endpoint
    const categoriesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/categories?select=*&store_id=eq.${store.id}&is_active=eq.true&order=name`,
      method: 'GET',
      headers
    };
    
    const categories = await makeRequest(categoriesOptions);
    console.log(`   🏷️ Categories: ${categories.length}`);
    categories.forEach(cat => console.log(`      - ${cat.name}`));
  }
  
  console.log('\n✅ POS API test complete!');
}

testPOSAPI().catch(console.error);
