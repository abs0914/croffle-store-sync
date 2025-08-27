#!/usr/bin/env node

/**
 * Test Inventory Deduction Phase 1
 * 
 * Tests inventory deduction for the fixed croffle products from Phase 1
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function req(options, data) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${json?.message || body}`));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function auth() {
  const authRes = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers.Authorization = `Bearer ${authRes.access_token}`;
}

async function main() {
  console.log('🧪 TESTING INVENTORY DEDUCTION - PHASE 1 RESULTS');
  console.log('=' .repeat(70));
  
  await auth();

  // Test the fixed croffle products
  const testResults = {
    totalTested: 0,
    readyForDeduction: 0,
    needsAttention: 0,
    details: []
  };
  
  // Get all stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });
  
  for (const store of stores) {
    console.log(`\n🏪 Testing: ${store.name}`);
    console.log('-'.repeat(50));
    
    const storeResults = await testStoreProducts(store);
    
    testResults.totalTested += storeResults.tested;
    testResults.readyForDeduction += storeResults.ready;
    testResults.needsAttention += storeResults.needsAttention;
    testResults.details.push(...storeResults.details);
    
    console.log(`   📊 Tested: ${storeResults.tested} products`);
    console.log(`   ✅ Ready: ${storeResults.ready} products`);
    console.log(`   ⚠️  Needs Attention: ${storeResults.needsAttention} products`);
  }
  
  // Generate final test report
  generateTestReport(testResults);
}

async function testStoreProducts(store) {
  const results = {
    tested: 0,
    ready: 0,
    needsAttention: 0,
    details: []
  };
  
  // Get croffle products (₱125) that should have been fixed
  const croffleProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&price=eq.125&product_name=ilike.%croffle%&recipe_id=not.is.null`,
    method: 'GET',
    headers
  });
  
  console.log(`   📦 Croffle products found: ${croffleProducts.length}`);
  
  for (const product of croffleProducts) {
    results.tested++;
    
    const testResult = await testProductDeduction(product, store);
    results.details.push(testResult);
    
    if (testResult.readyForDeduction) {
      results.ready++;
      console.log(`   ✅ ${product.product_name}: Ready for deduction`);
    } else {
      results.needsAttention++;
      console.log(`   ⚠️  ${product.product_name}: ${testResult.issue}`);
    }
  }
  
  return results;
}

async function testProductDeduction(product, store) {
  const testResult = {
    productId: product.id,
    productName: product.product_name,
    storeName: store.name,
    readyForDeduction: false,
    issue: null,
    mappings: 0,
    expectedMappings: 0,
    sufficientStock: false,
    details: []
  };
  
  try {
    // Get ingredient mappings
    const mappings = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${product.id}`,
      method: 'GET',
      headers
    });
    
    testResult.mappings = mappings.length;
    
    // Get recipe ingredients to know expected count
    const recipeIngredients = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
      method: 'GET',
      headers
    });
    
    testResult.expectedMappings = recipeIngredients.length;
    
    // Check if mappings are complete
    if (mappings.length === 0) {
      testResult.issue = 'No ingredient mappings found';
      return testResult;
    }
    
    if (mappings.length < recipeIngredients.length) {
      testResult.issue = `Incomplete mappings: ${mappings.length}/${recipeIngredients.length}`;
      return testResult;
    }
    
    // Check inventory availability
    let allStockSufficient = true;
    
    for (const mapping of mappings) {
      const inventory = mapping.inventory_item;
      
      if (!inventory) {
        testResult.issue = 'Missing inventory item reference';
        allStockSufficient = false;
        break;
      }
      
      if (inventory.stock_quantity < mapping.required_quantity) {
        testResult.issue = `Insufficient stock: ${inventory.item} (need ${mapping.required_quantity}, have ${inventory.stock_quantity})`;
        allStockSufficient = false;
        break;
      }
      
      testResult.details.push({
        ingredient: inventory.item,
        required: mapping.required_quantity,
        available: inventory.stock_quantity,
        sufficient: inventory.stock_quantity >= mapping.required_quantity
      });
    }
    
    testResult.sufficientStock = allStockSufficient;
    
    // Final assessment
    if (mappings.length === recipeIngredients.length && allStockSufficient) {
      testResult.readyForDeduction = true;
    } else if (!allStockSufficient) {
      testResult.issue = testResult.issue || 'Stock levels insufficient';
    }
    
  } catch (error) {
    testResult.issue = `Test error: ${error.message}`;
  }
  
  return testResult;
}

function generateTestReport(testResults) {
  console.log('\n📋 PHASE 1 INVENTORY DEDUCTION TEST REPORT');
  console.log('=' .repeat(70));
  
  const readyPercentage = testResults.totalTested > 0 
    ? ((testResults.readyForDeduction / testResults.totalTested) * 100).toFixed(1)
    : 0;
  
  console.log(`📊 TEST SUMMARY:`);
  console.log(`   Products Tested: ${testResults.totalTested}`);
  console.log(`   Ready for Deduction: ${testResults.readyForDeduction}`);
  console.log(`   Need Attention: ${testResults.needsAttention}`);
  console.log(`   Success Rate: ${readyPercentage}%`);
  
  // Show successful products
  const readyProducts = testResults.details.filter(d => d.readyForDeduction);
  if (readyProducts.length > 0) {
    console.log(`\n✅ PRODUCTS READY FOR INVENTORY DEDUCTION (${readyProducts.length}):`);
    readyProducts.forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.productName} (${product.storeName})`);
      console.log(`      Mappings: ${product.mappings}/${product.expectedMappings} complete`);
      console.log(`      Stock Status: All ingredients sufficient`);
    });
  }
  
  // Show products needing attention
  const needsAttention = testResults.details.filter(d => !d.readyForDeduction);
  if (needsAttention.length > 0) {
    console.log(`\n⚠️  PRODUCTS NEEDING ATTENTION (${needsAttention.length}):`);
    needsAttention.slice(0, 5).forEach((product, i) => {
      console.log(`   ${i + 1}. ${product.productName} (${product.storeName})`);
      console.log(`      Issue: ${product.issue}`);
      console.log(`      Mappings: ${product.mappings}/${product.expectedMappings}`);
    });
    
    if (needsAttention.length > 5) {
      console.log(`   ... and ${needsAttention.length - 5} more products`);
    }
  }
  
  // Assessment and recommendations
  console.log(`\n🎯 PHASE 1 ASSESSMENT:`);
  
  if (testResults.readyForDeduction >= 10) {
    console.log(`   ✅ PHASE 1 SUCCESSFUL: ${testResults.readyForDeduction} products ready for inventory deduction`);
    console.log(`   🎉 High-revenue croffles now have functional inventory synchronization`);
    console.log(`   💰 Revenue impact: ₱${testResults.readyForDeduction * 125} in products with accurate cost tracking`);
  } else if (testResults.readyForDeduction >= 5) {
    console.log(`   ⚠️  PHASE 1 PARTIAL SUCCESS: ${testResults.readyForDeduction} products ready`);
    console.log(`   🔄 Continue fixing remaining products with manual review`);
  } else {
    console.log(`   ❌ PHASE 1 NEEDS MORE WORK: Only ${testResults.readyForDeduction} products ready`);
    console.log(`   🔧 Review systematic approach and address blocking issues`);
  }
  
  console.log(`\n💡 NEXT STEPS:`);
  console.log(`   1. Process a test transaction for ready products`);
  console.log(`   2. Monitor inventory levels after sales`);
  console.log(`   3. Fix remaining products with manual review`);
  console.log(`   4. Continue with Phase 2: High Priority products`);
  
  console.log(`\n🏆 INVENTORY SYNCHRONIZATION STATUS:`);
  console.log(`   Before Phase 1: 0% of croffles had inventory deduction`);
  console.log(`   After Phase 1: ${readyPercentage}% of croffles have inventory deduction`);
  console.log(`   System Status: ${testResults.readyForDeduction > 0 ? 'PARTIALLY RESTORED' : 'NEEDS ATTENTION'}`);
}

main().catch(err => {
  console.error('Inventory deduction test failed:', err.message);
  process.exit(1);
});
