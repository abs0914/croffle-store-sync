#!/usr/bin/env node

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

async function findTiramisuStore() {
  console.log('🔍 Finding which store has Tiramisu...\n');
  
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
  
  // Check all stores
  console.log('🏪 All stores:');
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  stores.forEach(store => console.log(`   - ${store.name} (${store.id})`));
  
  // Check product catalog in all stores
  console.log('\n📦 Product catalog entries:');
  const catalogOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=*,stores(name)',
    method: 'GET',
    headers
  };
  
  const catalog = await makeRequest(catalogOptions);
  console.log(`Found ${catalog.length} total products across all stores:`);
  
  catalog.forEach(product => {
    const storeName = product.stores?.name || 'Unknown Store';
    console.log(`   - ${product.product_name} in ${storeName} - ₱${product.price}`);
  });
  
  // Find Tiramisu specifically
  console.log('\n🔍 Tiramisu products:');
  const tiramisuProducts = catalog.filter(p => p.product_name.toLowerCase().includes('tiramisu'));
  
  if (tiramisuProducts.length > 0) {
    tiramisuProducts.forEach(product => {
      const storeName = product.stores?.name || 'Unknown Store';
      console.log(`   ✅ Found: ${product.product_name} in ${storeName} (Store ID: ${product.store_id})`);
      console.log(`      Price: ₱${product.price}, Available: ${product.is_available}`);
    });
  } else {
    console.log('   ❌ No Tiramisu products found');
  }
  
  // Check recipes
  console.log('\n🍽️ Recipe entries:');
  const recipesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipes?select=*,stores(name)',
    method: 'GET',
    headers
  };
  
  const recipes = await makeRequest(recipesOptions);
  console.log(`Found ${recipes.length} total recipes:`);
  
  recipes.forEach(recipe => {
    const storeName = recipe.stores?.name || 'Unknown Store';
    console.log(`   - ${recipe.name} in ${storeName} - ₱${recipe.suggested_price}`);
  });
}

findTiramisuStore().catch(console.error);
