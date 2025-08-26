#!/usr/bin/env node

/**
 * Fix Product Categories Script
 * 
 * This script fixes the category issues in the POS system by:
 * 1. Creating standard categories for the store
 * 2. Mapping recipe template categories to POS categories
 * 3. Updating existing product catalog entries with proper categories
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

async function fixProductCategories() {
  console.log('🔧 Fixing product categories and POS display...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Step 1: Get the store ID
  console.log('🏪 Finding store...');
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name&limit=1',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  if (stores.length === 0) {
    console.log('❌ No stores found');
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
    categoryMap.set(categoryName.toLowerCase(), categoryId);
  }
  
  // Step 3: Get products without categories and their recipe template categories
  console.log('\n📦 Finding products needing category updates...');
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=id,product_name,category_id,recipe_id,recipes(template_id,recipe_templates(category_name))&store_id=eq.${storeId}`,
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`✅ Found ${products.length} products`);
  
  // Step 4: Update products with proper categories
  let updatedCount = 0;
  
  for (const product of products) {
    const templateCategory = product.recipes?.recipe_templates?.category_name;
    
    if (!templateCategory) {
      console.log(`   ⚠️ ${product.product_name}: No template category found`);
      continue;
    }
    
    // Find the mapping for this template category
    const mapping = CATEGORY_MAPPINGS.find(
      m => m.templateCategory.toLowerCase() === templateCategory.toLowerCase()
    );
    
    const targetCategoryName = mapping?.displayName || templateCategory;
    const targetCategoryId = categoryMap.get(targetCategoryName.toLowerCase());
    
    if (!targetCategoryId) {
      console.log(`   ❌ ${product.product_name}: No category mapping found for "${templateCategory}"`);
      continue;
    }
    
    // Update the product if it doesn't have the correct category
    if (product.category_id !== targetCategoryId) {
      console.log(`   🔄 ${product.product_name}: "${templateCategory}" → "${targetCategoryName}"`);
      
      const updateOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/product_catalog?id=eq.${product.id}`,
        method: 'PATCH',
        headers
      };
      
      try {
        await makeRequest(updateOptions, { category_id: targetCategoryId });
        console.log(`   ✅ Updated ${product.product_name}`);
        updatedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to update ${product.product_name}: ${error.message}`);
      }
    } else {
      console.log(`   ✅ ${product.product_name}: Already has correct category`);
    }
  }
  
  console.log(`\n📊 RESULTS:`);
  console.log(`   Products updated: ${updatedCount}`);
  console.log(`   Categories created: ${standardCategories.length}`);
  
  // Step 5: Verify the fix
  console.log('\n🔍 Verifying Tiramisu category...');
  const tiramisuOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=*,categories(name)&product_name=ilike.*tiramisu*&store_id=eq.${storeId}`,
    method: 'GET',
    headers
  };
  
  const tiramisuProducts = await makeRequest(tiramisuOptions);
  
  if (tiramisuProducts.length > 0) {
    const tiramisu = tiramisuProducts[0];
    const categoryName = tiramisu.categories?.name || 'Uncategorized';
    console.log(`✅ Tiramisu category: ${categoryName}`);
    
    if (categoryName === 'Classic') {
      console.log('🎉 Tiramisu is now properly categorized as "Classic"!');
    } else {
      console.log(`⚠️ Tiramisu category is "${categoryName}" (expected "Classic")`);
    }
  } else {
    console.log('❌ Tiramisu product not found');
  }
  
  console.log('\n✅ Product category fix complete!');
  console.log('💡 Please refresh the POS to see the updated categories.');
}

fixProductCategories().catch(console.error);
