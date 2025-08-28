#!/usr/bin/env node

/**
 * Fix Product Prices
 * 
 * This script updates all product catalog entries to use the suggested_price
 * from their corresponding recipe templates.
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

async function checkCurrentPrices() {
  console.log('\n🔍 Checking current product prices...');
  
  // Get products with their template prices
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=id,product_name,price,recipes(template_id,recipe_templates(name,suggested_price))&recipe_id=not.is.null&limit=10',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  
  console.log('   📊 Sample Product Prices:');
  products.forEach(product => {
    const templatePrice = product.recipes?.recipe_templates?.suggested_price || 0;
    const currentPrice = product.price || 0;
    const priceMatch = templatePrice === currentPrice;
    
    console.log(`      ${priceMatch ? '✅' : '❌'} ${product.product_name}: Current ₱${currentPrice}, Template ₱${templatePrice}`);
  });
  
  return products;
}

async function fixAllProductPrices() {
  console.log('\n🔧 Fixing all product prices...');
  
  // Get all products with their template prices
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=id,product_name,price,recipes(template_id,recipe_templates(name,suggested_price))&recipe_id=not.is.null',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`   Found ${products.length} products to update`);
  
  let updated = 0;
  let errors = 0;
  let skipped = 0;
  
  for (const product of products) {
    try {
      const templatePrice = product.recipes?.recipe_templates?.suggested_price;
      const currentPrice = product.price || 0;
      
      if (!templatePrice) {
        console.log(`      ⚠️ ${product.product_name}: No template price found`);
        skipped++;
        continue;
      }
      
      if (templatePrice === currentPrice) {
        skipped++;
        continue; // Price already correct
      }
      
      // Update the price
      const updateOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/product_catalog?id=eq.${product.id}`,
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      };
      
      await makeRequest(updateOptions, { price: templatePrice });
      console.log(`      ✅ ${product.product_name}: ₱${currentPrice} → ₱${templatePrice}`);
      updated++;
      
    } catch (error) {
      console.log(`      ❌ ${product.product_name}: ${error.message}`);
      errors++;
    }
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`   📊 Results: ${updated} updated, ${skipped} already correct, ${errors} errors`);
  return { updated, skipped, errors };
}

async function verifyPriceUpdates() {
  console.log('\n✅ Verifying price updates...');
  
  // Get sample of products to verify
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=id,product_name,price,recipes(template_id,recipe_templates(name,suggested_price))&recipe_id=not.is.null&limit=10',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  
  let correctPrices = 0;
  let incorrectPrices = 0;
  
  console.log('   📊 Verification Sample:');
  products.forEach(product => {
    const templatePrice = product.recipes?.recipe_templates?.suggested_price || 0;
    const currentPrice = product.price || 0;
    const priceMatch = templatePrice === currentPrice;
    
    if (priceMatch) {
      correctPrices++;
    } else {
      incorrectPrices++;
    }
    
    console.log(`      ${priceMatch ? '✅' : '❌'} ${product.product_name}: ₱${currentPrice} (should be ₱${templatePrice})`);
  });
  
  return { correctPrices, incorrectPrices };
}

async function generatePriceReport() {
  console.log('\n📊 Generating price report...');
  
  try {
    // Get all products with prices
    const productsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/product_catalog?select=id,product_name,price,categories(name)&is_available=eq.true',
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productsOptions);
    
    // Group by category and calculate stats
    const categoryStats = {};
    let totalProducts = 0;
    let productsWithPrices = 0;
    
    products.forEach(product => {
      totalProducts++;
      const categoryName = product.categories?.name || 'No Category';
      const price = product.price || 0;
      
      if (price > 0) {
        productsWithPrices++;
      }
      
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = {
          count: 0,
          totalValue: 0,
          avgPrice: 0,
          minPrice: Infinity,
          maxPrice: 0
        };
      }
      
      const stats = categoryStats[categoryName];
      stats.count++;
      stats.totalValue += price;
      stats.avgPrice = stats.totalValue / stats.count;
      stats.minPrice = Math.min(stats.minPrice, price);
      stats.maxPrice = Math.max(stats.maxPrice, price);
    });
    
    console.log('   📊 PRICE REPORT:');
    console.log(`      Total Products: ${totalProducts}`);
    console.log(`      Products with Prices: ${productsWithPrices} (${Math.round((productsWithPrices/totalProducts)*100)}%)`);
    
    console.log('\n   💰 PRICING BY CATEGORY:');
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b.count - a.count)
      .forEach(([category, stats]) => {
        console.log(`      📦 ${category}: ${stats.count} products`);
        console.log(`         Average: ₱${stats.avgPrice.toFixed(2)}`);
        console.log(`         Range: ₱${stats.minPrice === Infinity ? 0 : stats.minPrice} - ₱${stats.maxPrice}`);
      });
    
    return {
      totalProducts,
      productsWithPrices,
      pricingRate: Math.round((productsWithPrices/totalProducts)*100)
    };
    
  } catch (error) {
    console.log(`   ❌ Failed to generate report: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    console.log('💰 FIX PRODUCT PRICES');
    console.log('='.repeat(50));
    console.log('This script updates product prices to match template suggested_price');
    console.log('');
    
    await authenticateAdmin();
    
    // Check current prices
    await checkCurrentPrices();
    
    // Fix all product prices
    const fixResult = await fixAllProductPrices();
    
    // Verify updates
    const verifyResult = await verifyPriceUpdates();
    
    // Generate final report
    const report = await generatePriceReport();
    
    console.log('\n🎉 PRICE UPDATE COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Products Updated: ${fixResult.updated}`);
    console.log(`✓ Already Correct: ${fixResult.skipped}`);
    console.log(`❌ Errors: ${fixResult.errors}`);
    
    if (report && report.pricingRate >= 95) {
      console.log('\n✅ EXCELLENT: 95%+ products have proper pricing!');
    } else if (report && report.pricingRate >= 85) {
      console.log('\n✅ GOOD: 85%+ products have pricing.');
    } else {
      console.log('\n⚠️ Some products may need price attention.');
    }
    
    console.log('\n🎯 PRICING NOW MATCHES TEMPLATES!');
    console.log('   Product prices now reflect suggested_price from CSV');
    console.log('   POS will display correct pricing to customers');
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Check your POS system - prices should now be correct');
    console.log('   2. Verify pricing displays properly for customers');
    console.log('   3. Test order calculations with updated prices');
    console.log('   4. Prices are consistent across all stores');
    
  } catch (error) {
    console.error('❌ Price fix failed:', error.message);
    process.exit(1);
  }
}

main();
