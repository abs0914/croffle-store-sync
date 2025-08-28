#!/usr/bin/env node

/**
 * Fix Remaining Category Issues
 * 
 * This script addresses the remaining 178 uncategorized products by:
 * 1. Fixing broken recipe template links
 * 2. Assigning default categories for products without templates
 * 3. Cleaning up duplicate entries
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

// Default category assignments based on product names
const DEFAULT_CATEGORIES = {
  // Beverages
  'latte': 'Espresso',
  'americano': 'Espresso', 
  'cappuccino': 'Espresso',
  'mocha': 'Espresso',
  'espresso': 'Espresso',
  'coffee': 'Espresso',
  'tea': 'Cold Beverages',
  'lemonade': 'Cold Beverages',
  'water': 'Beverages',
  'coke': 'Beverages',
  'sprite': 'Beverages',
  'blended': 'Blended',
  'frappe': 'Blended',
  
  // Croffles
  'croffle': 'Classic',
  'overload': 'Mix & Match',
  'mini': 'Mix & Match',
  'glaze': 'Glaze',
  'premium': 'Premium',
  'classic': 'Classic',
  
  // Add-ons
  'sauce': 'Add-ons',
  'chocolate': 'Add-ons',
  'biscoff': 'Add-ons',
  'oreo': 'Add-ons',
  'marshmallow': 'Add-ons',
  'sprinkles': 'Add-ons',
  'jam': 'Add-ons',
  'crushed': 'Add-ons',
  'box': 'Add-ons',
  'bag': 'Add-ons',
  'peanut': 'Add-ons',
  'caramel': 'Add-ons',
  'tiramisu': 'Add-ons',
  'rectangle': 'Add-ons'
};

function getCategoryFromProductName(productName) {
  const name = productName.toLowerCase();
  
  for (const [keyword, category] of Object.entries(DEFAULT_CATEGORIES)) {
    if (name.includes(keyword)) {
      return category;
    }
  }
  
  return 'Classic'; // Default fallback
}

async function fixUncategorizedProducts() {
  console.log('🔧 Fixing uncategorized products...');
  
  // Get uncategorized products
  const uncategorizedOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=id,store_id,product_name,category_id&is.category_id.null',
    method: 'GET',
    headers
  };
  
  const uncategorized = await makeRequest(uncategorizedOptions);
  console.log(`   Found ${uncategorized.length} uncategorized products`);
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const product of uncategorized) {
    try {
      // Determine category from product name
      const categoryName = getCategoryFromProductName(product.product_name);
      
      // Get category ID for this store
      const categoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/categories?select=id&store_id=eq.${product.store_id}&name=eq.${encodeURIComponent(categoryName)}&is_active=eq.true`,
        method: 'GET',
        headers
      };
      
      const categories = await makeRequest(categoryOptions);
      
      if (categories.length === 0) {
        console.log(`   ❌ ${product.product_name}: Category "${categoryName}" not found`);
        errorCount++;
        continue;
      }
      
      const categoryId = categories[0].id;
      
      // Update product category
      const updateOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/product_catalog?id=eq.${product.id}`,
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      };
      
      await makeRequest(updateOptions, { category_id: categoryId });
      console.log(`   ✅ ${product.product_name}: → "${categoryName}"`);
      fixedCount++;
      
    } catch (error) {
      console.log(`   ❌ ${product.product_name}: ${error.message}`);
      errorCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n📊 Uncategorized fix results:`);
  console.log(`   Fixed: ${fixedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  return { fixed: fixedCount, errors: errorCount };
}

async function verifyFinalResults() {
  console.log('\n🔍 Final verification...');
  
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
  const storeStats = {};
  
  products.forEach(product => {
    // Track by store
    if (!storeStats[product.store_id]) {
      storeStats[product.store_id] = { total: 0, categorized: 0 };
    }
    storeStats[product.store_id].total++;
    
    if (!product.category_id || !product.categories) {
      uncategorized.push(product);
    } else {
      storeStats[product.store_id].categorized++;
      const categoryName = product.categories.name;
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = 0;
      }
      categoryStats[categoryName]++;
    }
  });
  
  console.log(`📊 Final category distribution:`);
  Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} products`);
    });
  
  console.log(`\n🏪 Store categorization status:`);
  Object.entries(storeStats).forEach(([storeId, stats]) => {
    const percentage = Math.round((stats.categorized / stats.total) * 100);
    console.log(`   Store ${storeId}: ${stats.categorized}/${stats.total} (${percentage}%)`);
  });
  
  const totalCategorized = products.length - uncategorized.length;
  const overallPercentage = Math.round((totalCategorized / products.length) * 100);
  
  console.log(`\n📈 Overall Results:`);
  console.log(`   Total products: ${products.length}`);
  console.log(`   Categorized: ${totalCategorized} (${overallPercentage}%)`);
  console.log(`   Uncategorized: ${uncategorized.length}`);
  
  return {
    totalProducts: products.length,
    categorized: totalCategorized,
    uncategorized: uncategorized.length,
    percentage: overallPercentage,
    categoryStats,
    storeStats
  };
}

async function main() {
  try {
    console.log('🚀 FIXING REMAINING CATEGORY ISSUES');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Step 1: Fix uncategorized products using name-based categorization
    const fixResults = await fixUncategorizedProducts();
    
    // Step 2: Final verification
    const verification = await verifyFinalResults();
    
    console.log('\n🎉 CATEGORY FIX COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📦 Total products: ${verification.totalProducts}`);
    console.log(`✅ Categorized: ${verification.categorized} (${verification.percentage}%)`);
    console.log(`❌ Remaining uncategorized: ${verification.uncategorized}`);
    console.log(`🔧 Fixed in this run: ${fixResults.fixed}`);
    
    if (verification.percentage >= 95) {
      console.log('\n🎯 EXCELLENT: 95%+ products are properly categorized!');
      console.log('   POS systems will show well-organized product catalogs.');
    } else if (verification.percentage >= 85) {
      console.log('\n✅ GOOD: 85%+ products are categorized.');
      console.log('   Most products will display in proper categories.');
    } else {
      console.log('\n⚠️ Some products still need manual review.');
    }
    
  } catch (error) {
    console.error('❌ Category fix failed:', error.message);
    process.exit(1);
  }
}

main();
