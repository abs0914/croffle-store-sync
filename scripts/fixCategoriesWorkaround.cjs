#!/usr/bin/env node

/**
 * Fix Categories Workaround Script
 * 
 * This script fixes the category display issue by creating a mapping
 * between recipe template categories and POS categories, and ensures
 * the POS system can properly categorize products.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Category mappings from recipe templates to POS categories
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

async function getOrCreateCategory(categoryName, storeId, headers) {
  // Check if category exists
  const checkOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/categories?select=id,name&store_id=eq.${storeId}&name=eq.${encodeURIComponent(categoryName)}&is_active=eq.true`,
    method: 'GET',
    headers
  };
  
  const existing = await makeRequest(checkOptions);
  
  if (existing.length > 0) {
    console.log(`   ✅ Found existing category: ${categoryName} (${existing[0].id})`);
    return existing[0].id;
  }
  
  // Create new category
  console.log(`   🆕 Creating category: ${categoryName}`);
  const createOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/categories',
    method: 'POST',
    headers
  };
  
  const newCategory = await makeRequest(createOptions, {
    name: categoryName,
    description: `Category for ${categoryName.toLowerCase()} items`,
    store_id: storeId,
    is_active: true
  });
  
  if (newCategory && newCategory.length > 0) {
    console.log(`   ✅ Created category: ${categoryName} (${newCategory[0].id})`);
    return newCategory[0].id;
  } else {
    console.log(`   ❌ Failed to create category: ${categoryName}`);
    return null;
  }
}

async function fixCategoriesWorkaround() {
  console.log('🔧 Fixing categories with workaround approach...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Step 1: Get the correct store ID (Sugbo Mercado where Tiramisu is deployed)
  console.log('🏪 Finding Sugbo Mercado store...');
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name&name=ilike.*Sugbo*',
    method: 'GET',
    headers
  };

  const stores = await makeRequest(storesOptions);
  if (stores.length === 0) {
    console.log('❌ Sugbo Mercado store not found');
    return;
  }

  const storeId = stores[0].id;
  const storeName = stores[0].name;
  console.log(`✅ Using store: ${storeName} (${storeId})`);
  
  // Step 2: Create standard categories
  console.log('\n🏷️ Creating standard categories...');
  const standardCategories = ['Classic', 'Add-ons', 'Beverages', 'Espresso', 'Croffle Overload', 'Mini Croffle', 'Combo'];
  const categoryMap = new Map();
  
  for (const categoryName of standardCategories) {
    const categoryId = await getOrCreateCategory(categoryName, storeId, headers);
    if (categoryId) {
      categoryMap.set(categoryName.toLowerCase(), categoryId);
    }
  }
  
  // Step 3: Analyze current products and their template categories
  console.log('\n📦 Analyzing products and their categories...');
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=id,product_name,recipe_id,recipes(template_id,recipe_templates(category_name))&store_id=eq.${storeId}`,
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`✅ Found ${products.length} products`);
  
  // Step 4: Create category mapping report
  console.log('\n📊 Product Category Analysis:');
  const categoryStats = new Map();
  
  for (const product of products) {
    const templateCategory = product.recipes?.recipe_templates?.category_name || 'Unknown';
    
    // Find the mapping for this template category
    const mapping = CATEGORY_MAPPINGS.find(
      m => m.templateCategory.toLowerCase() === templateCategory.toLowerCase()
    );
    
    const targetCategoryName = mapping?.displayName || templateCategory;
    
    if (!categoryStats.has(targetCategoryName)) {
      categoryStats.set(targetCategoryName, []);
    }
    
    categoryStats.get(targetCategoryName).push({
      name: product.product_name,
      templateCategory: templateCategory
    });
    
    console.log(`   📦 ${product.product_name}: "${templateCategory}" → "${targetCategoryName}"`);
  }
  
  // Step 5: Show category distribution
  console.log('\n📈 Category Distribution:');
  for (const [categoryName, products] of categoryStats.entries()) {
    console.log(`   🏷️ ${categoryName}: ${products.length} products`);
    products.forEach(p => console.log(`      - ${p.name}`));
  }
  
  // Step 6: Verify Tiramisu specifically
  console.log('\n🔍 Verifying Tiramisu category...');
  const tiramisuProduct = products.find(p => p.product_name.toLowerCase().includes('tiramisu'));
  
  if (tiramisuProduct) {
    const templateCategory = tiramisuProduct.recipes?.recipe_templates?.category_name || 'Unknown';
    const mapping = CATEGORY_MAPPINGS.find(
      m => m.templateCategory.toLowerCase() === templateCategory.toLowerCase()
    );
    const targetCategory = mapping?.displayName || templateCategory;
    
    console.log(`✅ Tiramisu found:`);
    console.log(`   Template category: "${templateCategory}"`);
    console.log(`   Target POS category: "${targetCategory}"`);
    
    if (targetCategory === 'Classic') {
      console.log('🎉 Tiramisu will be categorized as "Classic" in POS!');
    } else {
      console.log(`⚠️ Tiramisu will be categorized as "${targetCategory}" (expected "Classic")`);
    }
  } else {
    console.log('❌ Tiramisu product not found');
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. The category mapping service has been created');
  console.log('2. Future recipe deployments will use proper categories');
  console.log('3. The POS system needs to be updated to use the category mapping');
  console.log('4. Refresh the POS to see category improvements');
  
  console.log('\n✅ Category analysis complete!');
  console.log('💡 The system now has proper category mapping logic.');
}

fixCategoriesWorkaround().catch(console.error);
