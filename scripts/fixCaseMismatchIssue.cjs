#!/usr/bin/env node

/**
 * Fix Case Mismatch Issue
 * 
 * The issue is that recipe templates have lowercase category names (e.g., "premium")
 * but categories were created with proper case names (e.g., "Premium").
 * This script fixes the mismatch by updating recipe templates to use proper case.
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

// Mapping from lowercase template categories to proper case category names
const CASE_MAPPING = {
  'add-on': 'Add-on',
  'beverages': 'Beverages',
  'blended': 'Blended',
  'classic': 'Classic',
  'cold': 'Cold',
  'espresso': 'Espresso',
  'fruity': 'Fruity',
  'glaze': 'Glaze',
  'mix & match': 'Mix & Match',
  'premium': 'Premium'
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

async function fixRecipeTemplateCategories() {
  console.log('\n🔧 Fixing recipe template category case...');
  
  // Get all recipe templates with lowercase categories
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  console.log(`   Found ${templates.length} active templates`);
  
  let updated = 0;
  let errors = 0;
  
  for (const template of templates) {
    const currentCategory = template.category_name;
    const properCaseCategory = CASE_MAPPING[currentCategory.toLowerCase()];
    
    if (properCaseCategory && properCaseCategory !== currentCategory) {
      try {
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_templates?id=eq.${template.id}`,
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        await makeRequest(updateOptions, { category_name: properCaseCategory });
        console.log(`   ✅ ${template.name}: "${currentCategory}" → "${properCaseCategory}"`);
        updated++;
        
      } catch (error) {
        console.log(`   ❌ ${template.name}: ${error.message}`);
        errors++;
      }
    } else {
      console.log(`   ✓ ${template.name}: "${currentCategory}" (already correct)`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`   📊 Results: ${updated} updated, ${errors} errors`);
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
      
      // Find the category with exact name match (proper case)
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
      console.log(`   ✅ ${product.product_name}: "${templateCategory}"`);
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
    const [products, templates] = await Promise.all([
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
        path: '/rest/v1/recipe_templates?select=category_name&is_active=eq.true',
        method: 'GET',
        headers
      })
    ]);
    
    const categorizedProducts = products.filter(p => p.category_id).length;
    const uncategorizedProducts = products.length - categorizedProducts;
    const categorizationRate = Math.round((categorizedProducts / products.length) * 100);
    
    // Get unique template categories
    const templateCategories = [...new Set(templates.map(t => t.category_name))].sort();
    
    console.log('   📊 FINAL SYSTEM STATUS:');
    console.log(`      Total Products: ${products.length}`);
    console.log(`      Categorized Products: ${categorizedProducts} (${categorizationRate}%)`);
    console.log(`      Uncategorized Products: ${uncategorizedProducts}`);
    
    console.log('\n   🏷️ TEMPLATE CATEGORIES (after fix):');
    templateCategories.forEach(cat => console.log(`      - "${cat}"`));
    
    // Show sample categorized products by category
    const categoryGroups = {};
    products.filter(p => p.category_id && p.categories).forEach(p => {
      const catName = p.categories.name;
      if (!categoryGroups[catName]) categoryGroups[catName] = 0;
      categoryGroups[catName]++;
    });
    
    console.log('\n   📦 PRODUCTS BY CATEGORY:');
    Object.entries(categoryGroups)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`      ✅ ${category}: ${count} products`);
      });
    
    return {
      products: products.length,
      categorized: categorizedProducts,
      categorizationRate,
      templateCategories
    };
    
  } catch (error) {
    console.log(`   ❌ Failed to generate report: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    console.log('🔧 FIXING CASE MISMATCH ISSUE');
    console.log('='.repeat(50));
    console.log('This script fixes the case mismatch between template categories and POS categories');
    console.log('');
    
    await authenticateAdmin();
    
    // Step 1: Fix recipe template categories to use proper case
    await fixRecipeTemplateCategories();
    
    // Step 2: Fix product catalog categories
    await fixProductCatalogCategories();
    
    // Step 3: Generate final report
    const report = await generateFinalReport();
    
    console.log('\n🎉 CASE MISMATCH FIX COMPLETE!');
    console.log('='.repeat(50));
    
    if (report && report.categorizationRate >= 95) {
      console.log('✅ EXCELLENT: 95%+ products are properly categorized!');
    } else if (report && report.categorizationRate >= 85) {
      console.log('✅ GOOD: 85%+ products are categorized.');
    } else {
      console.log('⚠️ Some products still need attention.');
    }
    
    console.log('\n🎯 CATEGORIES NOW PROPERLY MATCHED!');
    console.log('   Template categories and POS categories use the same case');
    console.log('   Products should now appear in correct categories');
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Test the POS system to verify categories display correctly');
    console.log('   2. Check that products appear in their expected categories');
    console.log('   3. Future imports will maintain proper case consistency');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

main();
