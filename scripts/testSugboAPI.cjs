#!/usr/bin/env node

/**
 * Test Sugbo API Script
 * 
 * This script tests the API for Sugbo Mercado store specifically.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

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

async function testSugboAPI() {
  console.log('🔍 Testing Sugbo Mercado API...\n');
  
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
  
  console.log('🏪 Testing Sugbo Mercado (IT Park, Cebu)');
  console.log(`   Store ID: ${SUGBO_STORE_ID}`);
  
  // Test 1: Basic product catalog
  console.log('\n📦 Test 1: Basic product catalog');
  const basicOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${SUGBO_STORE_ID}&is_available=eq.true`,
    method: 'GET',
    headers
  };
  
  const basicProducts = await makeRequest(basicOptions);
  console.log(`✅ Found ${basicProducts.length} products`);
  basicProducts.forEach(p => console.log(`   - ${p.product_name} (₱${p.price})`));
  
  // Test 2: Product catalog with recipe templates
  console.log('\n🍽️ Test 2: Products with recipe templates');
  const recipeOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=*,recipes(template_id,recipe_templates(category_name))&store_id=eq.${SUGBO_STORE_ID}&is_available=eq.true`,
    method: 'GET',
    headers
  };
  
  const recipeProducts = await makeRequest(recipeOptions);
  console.log(`✅ Found ${recipeProducts.length} products with recipe data`);
  recipeProducts.forEach(p => {
    const templateCategory = p.recipes?.recipe_templates?.category_name || 'none';
    console.log(`   - ${p.product_name}: template category = "${templateCategory}"`);
  });
  
  // Test 3: Categories
  console.log('\n🏷️ Test 3: Categories');
  const categoriesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/categories?select=*&store_id=eq.${SUGBO_STORE_ID}&is_active=eq.true&order=name`,
    method: 'GET',
    headers
  };
  
  const categories = await makeRequest(categoriesOptions);
  console.log(`✅ Found ${categories.length} categories`);
  categories.forEach(c => console.log(`   - ${c.name} (${c.id})`));
  
  // Test 4: Full POS API simulation
  console.log('\n📱 Test 4: Full POS API simulation');
  const fullOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=*,ingredients:product_ingredients(*,inventory_item:inventory_stock(*)),category:categories(id,name),recipes(template_id,recipe_templates(category_name))&store_id=eq.${SUGBO_STORE_ID}&is_available=eq.true&order=display_order`,
    method: 'GET',
    headers
  };
  
  try {
    const fullProducts = await makeRequest(fullOptions);
    console.log(`✅ Full API call successful: ${fullProducts.length} products`);
    
    fullProducts.forEach(p => {
      const templateCategory = p.recipes?.recipe_templates?.category_name || 'none';
      const categoryName = p.category?.name || 'uncategorized';
      console.log(`   - ${p.product_name}:`);
      console.log(`     Template: "${templateCategory}"`);
      console.log(`     Category: "${categoryName}"`);
      console.log(`     Recipe ID: ${p.recipe_id || 'none'}`);
    });
  } catch (error) {
    console.log(`❌ Full API call failed: ${error.message}`);
  }
  
  // Test 5: Check what the POS should see
  console.log('\n🎯 Test 5: Expected POS behavior');
  
  if (recipeProducts.length > 0) {
    const tiramisu = recipeProducts.find(p => p.product_name.toLowerCase().includes('tiramisu'));
    
    if (tiramisu) {
      const templateCategory = tiramisu.recipes?.recipe_templates?.category_name;
      console.log(`✅ Tiramisu analysis:`);
      console.log(`   Template category: "${templateCategory}"`);
      console.log(`   Should map to: "Classic"`);
      
      const classicCategory = categories.find(c => c.name === 'Classic');
      if (classicCategory) {
        console.log(`   Classic category exists: ${classicCategory.id}`);
        console.log(`   🎉 POS should show Tiramisu in Classic category!`);
      } else {
        console.log(`   ❌ Classic category not found`);
      }
    }
  }
  
  console.log('\n✅ Sugbo API test complete!');
}

testSugboAPI().catch(console.error);
