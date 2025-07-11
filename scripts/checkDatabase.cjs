#!/usr/bin/env node

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

function makeRequest(options) {
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
    req.end();
  });
}

async function checkDatabase() {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Checking database contents...\n');
  
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
  console.log(`Found ${templates.length} templates:`);
  templates.forEach(t => console.log(`  - ${t.name} (${t.category_name}) - ₱${t.suggested_price}`));
  
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
  console.log(`Found ${recipes.length} recipes:`);
  recipes.forEach(r => console.log(`  - ${r.name} in ${r.stores?.name || 'Unknown'} - ₱${r.suggested_price}`));
  
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
  console.log(`Found ${catalog.length} products:`);
  catalog.forEach(p => console.log(`  - ${p.product_name} - ₱${p.price} (${p.is_available ? 'Available' : 'Unavailable'})`));
}

checkDatabase().catch(console.error);
