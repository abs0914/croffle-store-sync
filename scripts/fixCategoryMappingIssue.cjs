#!/usr/bin/env node

/**
 * Fix Category Mapping Issue
 * 
 * This script fixes the category mapping issue by:
 * 1. Reading actual category names from imported recipe templates
 * 2. Creating missing categories with exact CSV names
 * 3. Updating product catalog entries to use correct categories
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

async function getActualCategoriesFromTemplates() {
  console.log('\n📋 Getting actual category names from recipe templates...');
  
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=category_name&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  
  // Get unique category names from templates
  const actualCategories = [...new Set(
    templates
      .map(t => t.category_name)
      .filter(Boolean)
      .filter(cat => cat !== 'classic' && cat !== 'general') // Filter out default fallbacks
  )];
  
  console.log(`   Found ${actualCategories.length} unique categories in templates:`);
  actualCategories.forEach(cat => console.log(`   - "${cat}"`));
  
  return actualCategories;
}

async function createMissingCategories(actualCategories) {
  console.log('\n🏪 Creating missing categories for all stores...');
  
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
  
  let created = 0;
  let existing = 0;
  
  for (const store of stores) {
    console.log(`\n   Processing store: ${store.name}`);
    
    for (const categoryName of actualCategories) {
      // Check if category exists
      const checkOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/categories?select=id&store_id=eq.${store.id}&name=eq.${encodeURIComponent(categoryName)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const existingCategories = await makeRequest(checkOptions);
      
      if (existingCategories.length === 0) {
        // Create category with exact name from CSV
        const createOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/categories',
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        const categoryData = {
          store_id: store.id,
          name: categoryName, // Use exact CSV category name
          description: `${categoryName} items`,
          is_active: true
        };
        
        try {
          await makeRequest(createOptions, categoryData);
          console.log(`      ✅ Created: "${categoryName}"`);
          created++;
        } catch (error) {
          console.log(`      ❌ Failed to create "${categoryName}": ${error.message}`);
        }
      } else {
        console.log(`      ✓ Exists: "${categoryName}"`);
        existing++;
      }
    }
  }
  
  console.log(`\n   📊 Categories: ${created} created, ${existing} already existed`);
}

async function fixProductCatalogCategories() {
  console.log('\n📦 Fixing product catalog categories...');
  
  // Get all product catalog entries with their recipe template categories
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=id,store_id,product_name,recipe_id,recipes(template_id,recipe_templates(category_name))&recipe_id=not.is.null',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`   Found ${products.length} products with recipes`);
  
  let updated = 0;
  let errors = 0;
  
  for (const product of products) {
    try {
      const templateCategory = product.recipes?.recipe_templates?.category_name;
      if (!templateCategory) {
        console.log(`   ⚠️ ${product.product_name}: No template category`);
        continue;
      }
      
      // Find the category with exact name match
      const categoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/categories?select=id,name&store_id=eq.${product.store_id}&name=eq.${encodeURIComponent(templateCategory)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const categories = await makeRequest(categoryOptions);
      if (categories.length === 0) {
        console.log(`   ⚠️ ${product.product_name}: Category "${templateCategory}" not found`);
        continue;
      }
      
      // Update product catalog entry
      const updateOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/product_catalog?id=eq.${product.id}`,
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      };
      
      await makeRequest(updateOptions, { category_id: categories[0].id });
      console.log(`   ✅ ${product.product_name}: "${templateCategory}" → "${categories[0].name}"`);
      updated++;
      
    } catch (error) {
      console.log(`   ❌ ${product.product_name}: ${error.message}`);
      errors++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`   📊 Results: ${updated} updated, ${errors} errors`);
}

async function generateFinalReport() {
  console.log('\n📊 Generating final report...');
  
  try {
    // Get categorization statistics
    const [products, categories] = await Promise.all([
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/product_catalog?select=id,category_id,categories(name)&is_available=eq.true',
        method: 'GET',
        headers
      }),
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/categories?select=name&is_active=eq.true',
        method: 'GET',
        headers
      })
    ]);
    
    const categorizedProducts = products.filter(p => p.category_id).length;
    const uncategorizedProducts = products.length - categorizedProducts;
    const categorizationRate = Math.round((categorizedProducts / products.length) * 100);
    
    // Get unique category names
    const uniqueCategories = [...new Set(categories.map(c => c.name))].sort();
    
    console.log('   📊 FINAL SYSTEM STATUS:');
    console.log(`      Total Products: ${products.length}`);
    console.log(`      Categorized Products: ${categorizedProducts} (${categorizationRate}%)`);
    console.log(`      Uncategorized Products: ${uncategorizedProducts}`);
    console.log(`      Total Categories: ${uniqueCategories.length}`);
    
    console.log('\n   🏷️ AVAILABLE CATEGORIES:');
    uniqueCategories.forEach(cat => console.log(`      - "${cat}"`));
    
    // Show sample categorized products
    console.log('\n   📦 SAMPLE CATEGORIZED PRODUCTS:');
    products
      .filter(p => p.category_id && p.categories)
      .slice(0, 10)
      .forEach(p => console.log(`      ✅ ${p.categories.name}: (products in this category)`));
    
    return {
      products: products.length,
      categorized: categorizedProducts,
      categorizationRate,
      categories: uniqueCategories.length
    };
    
  } catch (error) {
    console.log(`   ❌ Failed to generate report: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    console.log('🔧 FIXING CATEGORY MAPPING ISSUE');
    console.log('='.repeat(50));
    console.log('This script will fix categories to use exact CSV values');
    console.log('');
    
    await authenticateAdmin();
    
    // Step 1: Get actual categories from templates
    const actualCategories = await getActualCategoriesFromTemplates();
    
    // Step 2: Create missing categories with exact names
    await createMissingCategories(actualCategories);
    
    // Step 3: Fix product catalog categories
    await fixProductCatalogCategories();
    
    // Step 4: Generate final report
    const report = await generateFinalReport();
    
    console.log('\n🎉 CATEGORY MAPPING FIX COMPLETE!');
    console.log('='.repeat(50));
    
    if (report && report.categorizationRate >= 90) {
      console.log('✅ EXCELLENT: 90%+ products are properly categorized!');
    } else if (report && report.categorizationRate >= 80) {
      console.log('✅ GOOD: 80%+ products are categorized.');
    } else {
      console.log('⚠️ Some products still need attention.');
    }
    
    console.log('\n🎯 CATEGORIES NOW USE EXACT CSV VALUES!');
    console.log('   No more mapping, no more conversion');
    console.log('   Categories are exactly as specified in your CSV file');
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Update the code to prevent future mapping issues');
    console.log('   2. Test the POS system to verify categories display correctly');
    console.log('   3. Future imports will use exact CSV category names');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

main();
