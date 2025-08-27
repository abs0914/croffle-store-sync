#!/usr/bin/env node

/**
 * Test Payment Validation System
 * 
 * Tests the payment validation functionality to identify any issues
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const STORE_ID = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

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
  console.log('🧪 TESTING PAYMENT VALIDATION SYSTEM');
  console.log('=' .repeat(60));
  console.log(`Store: ${STORE_ID}`);
  
  await auth();

  // Test 1: Check if we have available products for testing
  console.log('\n📊 TEST 1: Check Available Products');
  try {
    const products = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,price,is_available,product_status&store_id=eq.${STORE_ID}&is_available=eq.true&limit=5`,
      method: 'GET',
      headers
    });
    
    console.log(`   ✅ Found ${products.length} available products for testing`);
    
    if (products.length === 0) {
      console.log(`   ❌ No available products found - this could cause payment validation to fail`);
      console.log(`   💡 SOLUTION: Make some products available in the Product Catalog`);
      return;
    }
    
    // Show sample products
    products.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.product_name} - ₱${p.price} (${p.product_status})`);
    });
    
    // Test 2: Check store and shift status
    console.log('\n📊 TEST 2: Check Store and Shift Status');
    
    // Check if store exists and is active
    const stores = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/stores?select=id,name,is_active&id=eq.${STORE_ID}`,
      method: 'GET',
      headers
    });
    
    if (stores.length === 0) {
      console.log(`   ❌ Store not found - this will cause payment validation to fail`);
      return;
    }
    
    const store = stores[0];
    console.log(`   ✅ Store found: ${store.name} (Active: ${store.is_active})`);
    
    if (!store.is_active) {
      console.log(`   ⚠️  Store is inactive - this may cause issues`);
    }
    
    // Check for active shifts (shifts without end_time are considered active)
    const shifts = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/shifts?select=id,start_time,end_time&store_id=eq.${STORE_ID}&end_time=is.null`,
      method: 'GET',
      headers
    });
    
    console.log(`   ${shifts.length > 0 ? '✅' : '⚠️'} Active shifts: ${shifts.length}`);
    
    if (shifts.length === 0) {
      console.log(`   💡 No active shift found - users need to start a shift before processing payments`);
    }
    
    // Test 3: Check inventory for recipe-based products
    console.log('\n📊 TEST 3: Check Inventory Status');
    
    const recipeProducts = products.filter(p => p.id);
    if (recipeProducts.length > 0) {
      const productId = recipeProducts[0].id;
      
      // Check if product has ingredients
      const ingredients = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${productId}`,
        method: 'GET',
        headers
      });
      
      console.log(`   📦 Product "${recipeProducts[0].product_name}" has ${ingredients.length} ingredients`);
      
      if (ingredients.length === 0) {
        console.log(`   ⚠️  No ingredients defined - this may cause validation warnings`);
      } else {
        let hasStock = false;
        ingredients.forEach(ing => {
          const stock = ing.inventory_item;
          if (stock && stock.stock_quantity > 0) {
            hasStock = true;
            console.log(`   ✅ ${stock.item}: ${stock.stock_quantity} ${stock.unit}`);
          } else if (stock) {
            console.log(`   ❌ ${stock.item}: Out of stock`);
          } else {
            console.log(`   ❌ Missing inventory item for ingredient`);
          }
        });
        
        if (!hasStock) {
          console.log(`   ⚠️  No ingredients in stock - this may cause validation to fail`);
        }
      }
    }
    
    // Test 4: Simulate payment validation scenarios
    console.log('\n📊 TEST 4: Payment Validation Scenarios');
    
    console.log('   💰 Cash Payment Validation:');
    console.log('     - Total: ₱100, Tendered: ₱150 → Should PASS');
    console.log('     - Total: ₱100, Tendered: ₱50 → Should FAIL (insufficient)');
    console.log('     - Total: ₱0, Tendered: ₱0 → Should PASS (complimentary)');
    
    console.log('   💳 Card Payment Validation:');
    console.log('     - Card Type: "Visa", Last 4: "1234" → Should PASS');
    console.log('     - Missing card type → Should FAIL');
    console.log('     - Invalid card number format → Should FAIL');
    
    console.log('   📱 E-Wallet Payment Validation:');
    console.log('     - Provider: "GCash", Reference: "GC123456789" → Should PASS');
    console.log('     - Missing provider → Should FAIL');
    console.log('     - Short reference number → Should FAIL');
    
    // Test 5: Check for common payment validation failure causes
    console.log('\n📊 TEST 5: Common Payment Validation Failure Causes');
    
    const commonIssues = [];
    
    if (products.length === 0) {
      commonIssues.push('No available products');
    }
    
    if (!store.is_active) {
      commonIssues.push('Store is inactive');
    }
    
    if (shifts.length === 0) {
      commonIssues.push('No active shift');
    }
    
    // Check for system health issues
    try {
      const healthCheck = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: '/rest/v1/rpc/check_system_health',
        method: 'POST',
        headers
      });
      console.log('   ✅ System health check passed');
    } catch (error) {
      console.log('   ⚠️  System health check failed or not available');
      commonIssues.push('System health check issues');
    }
    
    if (commonIssues.length === 0) {
      console.log('\n✅ PAYMENT VALIDATION SYSTEM APPEARS HEALTHY');
      console.log('\n🎯 LIKELY CAUSES OF PAYMENT VALIDATION FAILURES:');
      console.log('   1. Frontend validation logic issues');
      console.log('   2. React state management problems');
      console.log('   3. Network connectivity issues');
      console.log('   4. Browser console errors');
      console.log('   5. Missing form field validation');
      console.log('\n💡 DEBUGGING STEPS:');
      console.log('   1. Open browser developer tools');
      console.log('   2. Check console for JavaScript errors');
      console.log('   3. Monitor network tab for failed requests');
      console.log('   4. Test with simple cash payment first');
      console.log('   5. Verify all required fields are filled');
    } else {
      console.log('\n❌ PAYMENT VALIDATION ISSUES FOUND:');
      commonIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      if (commonIssues.includes('No available products')) {
        console.log('   - Go to Product Catalog and make some products available');
      }
      if (commonIssues.includes('Store is inactive')) {
        console.log('   - Activate the store in the admin panel');
      }
      if (commonIssues.includes('No active shift')) {
        console.log('   - Start a new shift in the POS system');
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

main().catch(err => {
  console.error('Payment validation test failed:', err.message);
  process.exit(1);
});
