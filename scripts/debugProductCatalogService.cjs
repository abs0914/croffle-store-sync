#!/usr/bin/env node

/**
 * Debug Product Catalog Service
 * 
 * Tests the fetchProductCatalog service used by the Product Catalog page
 * to see if it's hitting RLS issues with cross-table joins.
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
  console.log('🔍 DEBUG PRODUCT CATALOG SERVICE');
  console.log('=' .repeat(60));
  console.log(`Store: ${STORE_ID}`);
  
  await auth();

  // Test 1: Simple query (no joins) - should return all 75 products
  console.log('\n📊 TEST 1: Simple Query (no joins)');
  try {
    const simple = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,is_available,product_status&store_id=eq.${STORE_ID}&order=display_order.asc.nullslast`,
      method: 'GET',
      headers
    });
    console.log(`   ✅ Simple query returned: ${simple.length} products`);
  } catch (error) {
    console.log(`   ❌ Simple query failed: ${error.message}`);
  }

  // Test 2: Complex query with joins (what Product Catalog service uses)
  console.log('\n📊 TEST 2: Complex Query (with joins - Product Catalog service)');
  try {
    const complex = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=*,ingredients:product_ingredients(*,inventory_item:inventory_stock(*))&store_id=eq.${STORE_ID}&order=display_order.asc.nullslast`,
      method: 'GET',
      headers
    });
    console.log(`   ✅ Complex query returned: ${complex.length} products`);
  } catch (error) {
    console.log(`   ❌ Complex query failed: ${error.message}`);
    console.log(`   This is likely an RLS (Row Level Security) issue with cross-table joins`);
  }

  // Test 3: POS query (what we fixed)
  console.log('\n📊 TEST 3: POS Query (fixed version)');
  try {
    const pos = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,description,price,category_id,store_id,image_url,is_available,product_status,recipe_id&store_id=eq.${STORE_ID}&order=display_order.asc.nullslast`,
      method: 'GET',
      headers
    });
    console.log(`   ✅ POS query returned: ${pos.length} products`);
  } catch (error) {
    console.log(`   ❌ POS query failed: ${error.message}`);
  }

  console.log('\n🎯 DIAGNOSIS:');
  console.log('   The Product Catalog page uses fetchProductCatalog() which includes');
  console.log('   cross-table joins to product_ingredients and inventory_stock.');
  console.log('   This can trigger RLS issues and return fewer results.');
  console.log('');
  console.log('   SOLUTION: Update fetchProductCatalog to use the same safe query');
  console.log('   pattern as fetchProductCatalogForPOS (no cross-table joins).');
}

main().catch(err => {
  console.error('Debug failed:', err.message);
  process.exit(1);
});
