#!/usr/bin/env node

/**
 * Test Category Mapping Script
 * 
 * This script tests the category mapping functionality.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

// Category mappings
const CATEGORY_MAPPINGS = [
  { templateCategory: 'classic', posCategory: 'Classic', displayName: 'Classic' },
  { templateCategory: 'Classic', posCategory: 'Classic', displayName: 'Classic' },
  { templateCategory: 'addon', posCategory: 'Add-ons', displayName: 'Add-ons' },
  { templateCategory: 'Add-ons', posCategory: 'Add-ons', displayName: 'Add-ons' },
  { templateCategory: 'beverages', posCategory: 'Beverages', displayName: 'Beverages' },
  { templateCategory: 'Beverages', posCategory: 'Beverages', displayName: 'Beverages' },
  { templateCategory: 'espresso', posCategory: 'Espresso', displayName: 'Espresso' },
  { templateCategory: 'Espresso', posCategory: 'Espresso', displayName: 'Espresso' },
  { templateCategory: 'croffle_overload', posCategory: 'Croffle Overload', displayName: 'Croffle Overload' },
  { templateCategory: 'mini_croffle', posCategory: 'Mini Croffle', displayName: 'Mini Croffle' },
  { templateCategory: 'combo', posCategory: 'Combo', displayName: 'Combo' },
  { templateCategory: 'others', posCategory: 'Beverages', displayName: 'Beverages' }
];

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

function getPOSCategoryName(templateCategory) {
  const mapping = CATEGORY_MAPPINGS.find(
    m => m.templateCategory.toLowerCase() === templateCategory.toLowerCase()
  );
  return mapping?.displayName || 'Classic';
}

async function testCategoryMapping() {
  console.log('🧪 Testing category mapping functionality...\n');
  
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
  
  console.log('🏪 Testing Sugbo Mercado store...');
  
  // Get products with their recipe template categories
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=*,recipes(id,template_id,recipe_templates(category_name))&store_id=eq.${SUGBO_STORE_ID}`,
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`📦 Found ${products.length} products:`);
  
  // Get categories for this store
  const categoriesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/categories?select=*&store_id=eq.${SUGBO_STORE_ID}&is_active=eq.true&order=name`,
    method: 'GET',
    headers
  };
  
  const categories = await makeRequest(categoriesOptions);
  console.log(`🏷️ Found ${categories.length} categories:`);
  categories.forEach(cat => console.log(`   - ${cat.name} (${cat.id})`));
  
  const categoryMap = new Map(categories.map(c => [c.name, c]));
  
  console.log('\n🔄 Testing category mapping:');
  
  products.forEach(product => {
    const templateCategory = product.recipes?.recipe_templates?.category_name || 'none';
    const posCategoryName = getPOSCategoryName(templateCategory);
    const category = categoryMap.get(posCategoryName);
    
    console.log(`\n📦 ${product.product_name}:`);
    console.log(`   Template category: "${templateCategory}"`);
    console.log(`   Mapped to POS category: "${posCategoryName}"`);
    console.log(`   Category found: ${category ? `"${category.name}" (${category.id})` : 'NOT FOUND'}`);
    
    if (category) {
      console.log(`   ✅ Mapping successful`);
    } else {
      console.log(`   ❌ Mapping failed - category "${posCategoryName}" not found`);
    }
  });
  
  // Test specific case: Tiramisu
  console.log('\n🎯 Specific test: Tiramisu');
  const tiramisu = products.find(p => p.product_name.toLowerCase().includes('tiramisu'));
  
  if (tiramisu) {
    const templateCategory = tiramisu.recipes?.recipe_templates?.category_name;
    const posCategoryName = getPOSCategoryName(templateCategory);
    const category = categoryMap.get(posCategoryName);
    
    console.log(`✅ Tiramisu found:`);
    console.log(`   Template: "${templateCategory}"`);
    console.log(`   POS Category: "${posCategoryName}"`);
    console.log(`   Category ID: ${category?.id}`);
    
    if (templateCategory === 'classic' && posCategoryName === 'Classic' && category) {
      console.log(`🎉 SUCCESS: Tiramisu correctly maps to Classic category!`);
    } else {
      console.log(`❌ FAILED: Tiramisu mapping is incorrect`);
    }
  } else {
    console.log(`❌ Tiramisu not found`);
  }
  
  // Test what the POS would see
  console.log('\n📱 Simulating POS category tabs:');
  const uniqueCategories = [...new Set(products.map(p => {
    const templateCategory = p.recipes?.recipe_templates?.category_name || 'none';
    return getPOSCategoryName(templateCategory);
  }))];
  
  console.log('Expected category tabs:');
  uniqueCategories.forEach(catName => {
    const category = categoryMap.get(catName);
    const productCount = products.filter(p => {
      const templateCategory = p.recipes?.recipe_templates?.category_name || 'none';
      return getPOSCategoryName(templateCategory) === catName;
    }).length;
    
    console.log(`   - ${catName} (${productCount} products) ${category ? '✅' : '❌'}`);
  });
  
  console.log('\n✅ Category mapping test complete!');
}

testCategoryMapping().catch(console.error);
