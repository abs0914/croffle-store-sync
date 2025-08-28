#!/usr/bin/env node

/**
 * Debug Category Issue
 * 
 * This script investigates the exact category mismatch issue
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
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
          const result = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result?.message || body}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          resolve(body);
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
  console.log('🔐 Authenticating admin user...');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  const authResult = await makeRequest(authOptions, authData);
  
  if (authResult.access_token) {
    headers.Authorization = `Bearer ${authResult.access_token}`;
    console.log('✅ Admin authenticated successfully');
  } else {
    throw new Error('Authentication failed');
  }
}

async function debugCategoryMismatch() {
  console.log('\n🔍 Debugging category mismatch...');
  
  // Get a sample product that's failing
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=id,product_name,store_id,recipe_id,recipes(template_id,recipe_templates(category_name))&product_name=eq.' + encodeURIComponent('Nutella Croffle') + '&limit=1',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  if (products.length === 0) {
    console.log('   No sample product found');
    return;
  }
  
  const product = products[0];
  console.log(`   Sample Product: ${product.product_name}`);
  console.log(`   Store ID: ${product.store_id}`);
  console.log(`   Template Category: "${product.recipes?.recipe_templates?.category_name}"`);
  
  // Check what categories exist for this store
  const categoriesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/categories?select=id,name&store_id=eq.${product.store_id}&is_active=eq.true`,
    method: 'GET',
    headers
  };
  
  const categories = await makeRequest(categoriesOptions);
  console.log(`   Available Categories for this store:`);
  categories.forEach(cat => console.log(`      - "${cat.name}" (ID: ${cat.id})`));
  
  // Check if there's a case mismatch
  const templateCategory = product.recipes?.recipe_templates?.category_name;
  const exactMatch = categories.find(c => c.name === templateCategory);
  const caseInsensitiveMatch = categories.find(c => c.name.toLowerCase() === templateCategory?.toLowerCase());
  
  console.log(`   Exact match for "${templateCategory}": ${exactMatch ? 'YES' : 'NO'}`);
  console.log(`   Case-insensitive match: ${caseInsensitiveMatch ? `YES ("${caseInsensitiveMatch.name}")` : 'NO'}`);
  
  if (caseInsensitiveMatch && !exactMatch) {
    console.log(`   🎯 FOUND THE ISSUE: Template has "${templateCategory}" but category is "${caseInsensitiveMatch.name}"`);
  }
}

async function main() {
  try {
    console.log('🔍 DEBUGGING CATEGORY ISSUE');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    await debugCategoryMismatch();
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  }
}

main();
