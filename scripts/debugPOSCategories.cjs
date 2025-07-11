#!/usr/bin/env node

/**
 * Debug POS Categories Script
 * 
 * This script debugs the category issues in the POS system.
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

async function debugPOSCategories() {
  console.log('🔍 Debugging POS Categories...\n');
  
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
  
  // Check all stores and their products
  console.log('🏪 All stores and their products:');
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  
  for (const store of stores) {
    console.log(`\n📍 Store: ${store.name} (${store.id})`);
    
    // Get products for this store
    const productsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=*,recipes(template_id,recipe_templates(category_name))&store_id=eq.${store.id}`,
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productsOptions);
    console.log(`   📦 Products: ${products.length}`);
    
    products.forEach(product => {
      const templateCategory = product.recipes?.recipe_templates?.category_name || 'No template';
      console.log(`      - ${product.product_name}: template="${templateCategory}"`);
    });
    
    // Get categories for this store
    const categoriesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/categories?select=*&store_id=eq.${store.id}&is_active=eq.true&order=name`,
      method: 'GET',
      headers
    };
    
    const categories = await makeRequest(categoriesOptions);
    console.log(`   🏷️ Categories: ${categories.length}`);
    
    categories.forEach(category => {
      console.log(`      - ${category.name} (${category.id})`);
    });
  }
  
  // Check which store the POS is likely using (first store or one with most products)
  console.log('\n🎯 POS Store Analysis:');
  
  const storeWithMostProducts = stores.reduce(async (prevPromise, store) => {
    const prev = await prevPromise;
    
    const productsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=id&store_id=eq.${store.id}`,
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productsOptions);
    
    if (products.length > prev.productCount) {
      return { store, productCount: products.length };
    }
    return prev;
  }, Promise.resolve({ store: null, productCount: 0 }));
  
  const result = await storeWithMostProducts;
  console.log(`Most likely POS store: ${result.store?.name} with ${result.productCount} products`);
  
  // Check app_users to see which store the admin user is associated with
  console.log('\n👤 Checking admin user store association:');
  const userOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/app_users?select=*,stores(name)&user_id=eq.${authResult.user.id}`,
    method: 'GET',
    headers
  };
  
  const users = await makeRequest(userOptions);
  if (users.length > 0) {
    const user = users[0];
    console.log(`Admin user is associated with store: ${user.stores?.name || 'Unknown'} (${user.store_id})`);
  } else {
    console.log('Admin user not found in app_users table');
  }
}

debugPOSCategories().catch(console.error);
