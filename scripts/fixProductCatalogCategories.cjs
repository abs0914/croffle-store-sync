#!/usr/bin/env node

/**
 * Fix Product Catalog Categories
 * 
 * This script fixes the category mapping issue where products show as "uncategorized" 
 * or "unknown" instead of their proper categories from recipe templates.
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

// Category mapping from recipe template categories to POS categories
const CATEGORY_MAPPING = {
  'premium': 'Premium',
  'fruity': 'Fruity', 
  'classic': 'Classic',
  'combo': 'Combo',
  'mini_croffle': 'Mini Croffle',
  'croffle_overload': 'Croffle Overload',
  'add-on': 'Add-ons',
  'addon': 'Add-ons',
  'espresso': 'Espresso',
  'beverages': 'Beverages',
  'blended': 'Blended',
  'cold': 'Cold Beverages',
  'glaze': 'Glaze',
  'mix & match': 'Mix & Match',
  // Legacy mappings
  'croffles': 'Classic',
  'drinks': 'Beverages',
  'add-ons': 'Add-ons',
  'combos': 'Combo'
};

async function createMissingCategories() {
  console.log('🏷️ Creating missing categories...');
  
  // Get all stores
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  console.log(`   Found ${stores.length} active stores`);
  
  const uniqueCategories = [...new Set(Object.values(CATEGORY_MAPPING))];
  console.log(`   Need to ensure ${uniqueCategories.length} categories exist`);
  
  for (const store of stores) {
    console.log(`\n   🏪 Processing ${store.name}...`);
    
    for (const categoryName of uniqueCategories) {
      // Check if category exists
      const checkOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/categories?select=id&store_id=eq.${store.id}&name=eq.${encodeURIComponent(categoryName)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const existing = await makeRequest(checkOptions);
      
      if (existing.length === 0) {
        // Create category
        const createOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/categories',
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        const categoryData = {
          store_id: store.id,
          name: categoryName,
          description: `Category for ${categoryName} items`,
          is_active: true
        };
        
        try {
          await makeRequest(createOptions, categoryData);
          console.log(`      ✅ Created category: ${categoryName}`);
        } catch (error) {
          console.log(`      ❌ Failed to create ${categoryName}: ${error.message}`);
        }
      } else {
        console.log(`      ✅ Category exists: ${categoryName}`);
      }
    }
  }
}

async function fixProductCatalogCategories() {
  console.log('\n🔧 Fixing product catalog categories...');
  
  // Get all product catalog entries with their recipe template categories
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=id,store_id,product_name,category_id,recipe_id,recipes(template_id,recipe_templates(category_name))',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`   Found ${products.length} product catalog entries`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const product of products) {
    try {
      // Get template category
      const templateCategory = product.recipes?.recipe_templates?.category_name;
      
      if (!templateCategory) {
        console.log(`   ⚠️ ${product.product_name}: No template category found`);
        skippedCount++;
        continue;
      }
      
      // Map to POS category
      const posCategory = CATEGORY_MAPPING[templateCategory.toLowerCase()] || 'Classic';
      
      // Get category ID for this store
      const categoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/categories?select=id&store_id=eq.${product.store_id}&name=eq.${encodeURIComponent(posCategory)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const categories = await makeRequest(categoryOptions);
      
      if (categories.length === 0) {
        console.log(`   ❌ ${product.product_name}: Category "${posCategory}" not found`);
        errorCount++;
        continue;
      }
      
      const categoryId = categories[0].id;
      
      // Update product if category is different
      if (product.category_id !== categoryId) {
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?id=eq.${product.id}`,
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        await makeRequest(updateOptions, { category_id: categoryId });
        console.log(`   ✅ ${product.product_name}: "${templateCategory}" → "${posCategory}"`);
        updatedCount++;
      } else {
        console.log(`   ✅ ${product.product_name}: Already correct (${posCategory})`);
        skippedCount++;
      }
      
    } catch (error) {
      console.log(`   ❌ ${product.product_name}: ${error.message}`);
      errorCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n📊 Category fix results:`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  return { updated: updatedCount, skipped: skippedCount, errors: errorCount };
}

async function verifyCategories() {
  console.log('\n🔍 Verifying category assignments...');
  
  const verifyOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=store_id,category_id,categories(name)',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(verifyOptions);
  
  const categoryStats = {};
  const uncategorized = [];
  
  products.forEach(product => {
    if (!product.category_id || !product.categories) {
      uncategorized.push(product);
    } else {
      const categoryName = product.categories.name;
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = 0;
      }
      categoryStats[categoryName]++;
    }
  });
  
  console.log(`📊 Category distribution:`);
  Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} products`);
    });
  
  if (uncategorized.length > 0) {
    console.log(`\n⚠️ ${uncategorized.length} products still uncategorized`);
  } else {
    console.log(`\n🎉 All products are properly categorized!`);
  }
  
  return {
    totalProducts: products.length,
    categorized: products.length - uncategorized.length,
    uncategorized: uncategorized.length,
    categoryStats
  };
}

async function main() {
  try {
    console.log('🚀 FIXING PRODUCT CATALOG CATEGORIES');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Step 1: Create missing categories
    await createMissingCategories();
    
    // Step 2: Fix product catalog categories
    const fixResults = await fixProductCatalogCategories();
    
    // Step 3: Verify results
    const verification = await verifyCategories();
    
    console.log('\n🎉 CATEGORY FIX COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📦 Total products: ${verification.totalProducts}`);
    console.log(`✅ Categorized: ${verification.categorized}`);
    console.log(`❌ Uncategorized: ${verification.uncategorized}`);
    console.log(`🔧 Updated: ${fixResults.updated}`);
    
    if (verification.uncategorized === 0) {
      console.log('\n🎯 SUCCESS: All products now have proper categories!');
      console.log('   POS systems will show organized product catalogs.');
    } else {
      console.log('\n⚠️ Some products still need manual review.');
    }
    
  } catch (error) {
    console.error('❌ Category fix failed:', error.message);
    process.exit(1);
  }
}

main();
