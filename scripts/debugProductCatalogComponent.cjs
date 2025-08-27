#!/usr/bin/env node

/**
 * Debug Product Catalog Component Logic
 * 
 * Simulates the exact filtering logic used in StoreProductAvailability component
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
  console.log('🔍 DEBUG PRODUCT CATALOG COMPONENT LOGIC');
  console.log('=' .repeat(60));
  console.log(`Store: ${STORE_ID}`);
  
  await auth();

  // Simulate fetchProductCatalog (the service used by useProductCatalogState)
  console.log('\n📊 SIMULATING fetchProductCatalog SERVICE');
  try {
    const products = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=*,ingredients:product_ingredients(*,inventory_item:inventory_stock(*))&store_id=eq.${STORE_ID}&order=display_order.asc.nullslast`,
      method: 'GET',
      headers
    });
    
    console.log(`   ✅ fetchProductCatalog returned: ${products.length} products`);
    
    // Simulate the component filtering logic
    console.log('\n🔍 SIMULATING COMPONENT FILTERING LOGIC');
    
    // Default state: searchTerm = '', showUnavailableOnly = false
    const searchTerm = '';
    const showUnavailableOnly = false;
    
    console.log(`   Search term: "${searchTerm}"`);
    console.log(`   Show unavailable only: ${showUnavailableOnly}`);
    
    const filteredProducts = products.filter(product => {
      const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesAvailability = !showUnavailableOnly || !product.is_available;
      
      const passes = matchesSearch && matchesAvailability;
      
      if (!passes) {
        console.log(`     Filtered out: ${product.product_name} (search: ${matchesSearch}, availability: ${matchesAvailability})`);
      }
      
      return passes;
    });
    
    console.log(`\n📊 FILTERING RESULTS:`);
    console.log(`   Total products from service: ${products.length}`);
    console.log(`   After component filtering: ${filteredProducts.length}`);
    
    // Count by availability
    const availableProducts = products.filter(p => p.is_available);
    const unavailableProducts = products.filter(p => !p.is_available);
    
    console.log(`\n📈 AVAILABILITY BREAKDOWN:`);
    console.log(`   Available products: ${availableProducts.length}`);
    console.log(`   Unavailable products: ${unavailableProducts.length}`);
    
    // Show first few products of each type
    console.log(`\n✅ AVAILABLE PRODUCTS (first 10):`);
    availableProducts.slice(0, 10).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.product_name} - ₱${p.price} - ${p.product_status}`);
    });
    
    console.log(`\n❌ UNAVAILABLE PRODUCTS (first 10):`);
    unavailableProducts.slice(0, 10).forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.product_name} - ₱${p.price} - ${p.product_status}`);
    });
    
    // Test the availability filter logic specifically
    console.log(`\n🧪 TESTING AVAILABILITY FILTER LOGIC:`);
    console.log(`   showUnavailableOnly = false`);
    console.log(`   Logic: !showUnavailableOnly || !product.is_available`);
    console.log(`   For available product: !false || !true = true || false = true ✅`);
    console.log(`   For unavailable product: !false || !false = true || true = true ✅`);
    console.log(`   Expected: ALL products should pass (both available and unavailable)`);
    
    if (filteredProducts.length === products.length) {
      console.log(`\n✅ COMPONENT LOGIC IS CORRECT`);
      console.log(`   All ${products.length} products should be visible in the UI`);
      console.log(`   If you're seeing fewer, the issue might be:`);
      console.log(`   1. React Query cache issues`);
      console.log(`   2. Component re-render problems`);
      console.log(`   3. CSS/styling hiding products`);
      console.log(`   4. Different data being fetched in the browser`);
    } else {
      console.log(`\n❌ COMPONENT LOGIC HAS ISSUES`);
      console.log(`   Expected: ${products.length}, Got: ${filteredProducts.length}`);
    }
    
  } catch (error) {
    console.log(`   ❌ fetchProductCatalog failed: ${error.message}`);
    console.log(`   This could be the root cause - RLS issues with cross-table joins`);
  }
}

main().catch(err => {
  console.error('Debug failed:', err.message);
  process.exit(1);
});
