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
          console.log(`Status: ${res.statusCode}, Response:`, result);
          resolve(result);
        } catch (error) {
          console.log(`Status: ${res.statusCode}, Raw response:`, body);
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function checkDatabaseWithAuth() {
  console.log('🔐 Authenticating...');
  
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
  
  if (!authResult.access_token) {
    console.log('❌ Authentication failed');
    return;
  }
  
  console.log('✅ Authentication successful');
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${authResult.access_token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('\n🔍 Checking database contents...\n');
  
  // Check all recipe templates
  console.log('📋 All recipe templates:');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=name,category_name,suggested_price&limit=10',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  if (templates && Array.isArray(templates)) {
    console.log(`Found ${templates.length} templates:`);
    templates.forEach(t => console.log(`  - ${t.name} (${t.category_name}) - ₱${t.suggested_price}`));
  }
  
  // Check all recipes
  console.log('\n🏪 All recipes:');
  const recipesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipes?select=name,suggested_price,stores(name)&limit=10',
    method: 'GET',
    headers
  };
  
  const recipes = await makeRequest(recipesOptions);
  if (recipes && Array.isArray(recipes)) {
    console.log(`Found ${recipes.length} recipes:`);
    recipes.forEach(r => console.log(`  - ${r.name} in ${r.stores?.name || 'Unknown'} - ₱${r.suggested_price}`));
  }
  
  // Check product catalog
  console.log('\n📦 Product catalog:');
  const catalogOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=product_name,price,is_available&limit=10',
    method: 'GET',
    headers
  };
  
  const catalog = await makeRequest(catalogOptions);
  if (catalog && Array.isArray(catalog)) {
    console.log(`Found ${catalog.length} products:`);
    catalog.forEach(p => console.log(`  - ${p.product_name} - ₱${p.price} (${p.is_available ? 'Available' : 'Unavailable'})`));
  }
}

checkDatabaseWithAuth().catch(console.error);
