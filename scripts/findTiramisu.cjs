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

async function findTiramisu() {
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
  
  console.log('✅ Authentication successful');
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${authResult.access_token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('\n🔍 Searching for Tiramisu...\n');
  
  // Search recipe templates
  console.log('📋 Searching recipe templates for Tiramisu:');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=*&name=ilike.*tiramisu*',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  console.log(`Found ${templates.length} Tiramisu templates:`);
  templates.forEach(t => console.log(`  - ID: ${t.id}, Name: ${t.name}, Category: ${t.category_name}, Price: ₱${t.suggested_price}`));
  
  // Search all templates containing "tiramisu" (case insensitive)
  console.log('\n📋 Searching ALL templates for any containing "tiramisu":');
  const allTemplatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=*',
    method: 'GET',
    headers
  };
  
  const allTemplates = await makeRequest(allTemplatesOptions);
  const tiramisuTemplates = allTemplates.filter(t => 
    t.name.toLowerCase().includes('tiramisu') || 
    t.description?.toLowerCase().includes('tiramisu')
  );
  
  console.log(`Found ${tiramisuTemplates.length} templates containing "tiramisu":`);
  tiramisuTemplates.forEach(t => console.log(`  - ID: ${t.id}, Name: ${t.name}, Category: ${t.category_name}, Price: ₱${t.suggested_price}`));
  
  // Search recipes
  console.log('\n🏪 Searching recipes for Tiramisu:');
  const recipesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipes?select=*,stores(name)&name=ilike.*tiramisu*',
    method: 'GET',
    headers
  };
  
  const recipes = await makeRequest(recipesOptions);
  console.log(`Found ${recipes.length} Tiramisu recipes:`);
  recipes.forEach(r => console.log(`  - ID: ${r.id}, Name: ${r.name}, Store: ${r.stores?.name}, Price: ₱${r.suggested_price}, Template ID: ${r.template_id}`));
  
  // Search product catalog
  console.log('\n📦 Searching product catalog for Tiramisu:');
  const catalogOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=*&product_name=ilike.*tiramisu*',
    method: 'GET',
    headers
  };
  
  const catalog = await makeRequest(catalogOptions);
  console.log(`Found ${catalog.length} Tiramisu products:`);
  catalog.forEach(p => console.log(`  - ID: ${p.id}, Name: ${p.product_name}, Price: ₱${p.price}, Available: ${p.is_available}, Recipe ID: ${p.recipe_id}`));
}

findTiramisu().catch(console.error);
