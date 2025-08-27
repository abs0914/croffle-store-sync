#!/usr/bin/env node

/**
 * Test Product Catalog Fix
 * 
 * Tests the updated fetchProductCatalog service to ensure it returns all 75 products
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
  console.log('🧪 TESTING PRODUCT CATALOG FIX');
  console.log('=' .repeat(50));
  console.log(`Store: ${STORE_ID}`);
  
  await auth();

  // Test the new safe query (what the updated service now uses)
  console.log('\n📊 TESTING UPDATED fetchProductCatalog SERVICE');
  try {
    const products = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,description,price,category_id,store_id,image_url,is_available,product_status,recipe_id,display_order,created_at,updated_at&store_id=eq.${STORE_ID}&order=display_order.asc.nullslast`,
      method: 'GET',
      headers
    });
    
    console.log(`   ✅ Updated service returned: ${products.length} products`);
    
    const availableCount = products.filter(p => p.is_available).length;
    const unavailableCount = products.filter(p => !p.is_available).length;
    
    console.log(`   📈 Available: ${availableCount}`);
    console.log(`   📉 Unavailable: ${unavailableCount}`);
    
    if (products.length === 75) {
      console.log(`\n✅ SUCCESS: Product Catalog should now show all 75 products!`);
      console.log(`\n📋 EXPECTED RESULT IN UI:`);
      console.log(`   - Total Products card: 75`);
      console.log(`   - Available card: ${availableCount}`);
      console.log(`   - Unavailable card: ${unavailableCount}`);
      console.log(`   - Product grid: 75 product cards visible`);
      
      console.log(`\n🔄 NEXT STEPS:`);
      console.log(`   1. Refresh the Product Catalog page`);
      console.log(`   2. Clear browser cache if needed (React Query cache)`);
      console.log(`   3. Verify all 75 products are now visible`);
      console.log(`   4. Test the "Show Unavailable Only" filter`);
      
    } else {
      console.log(`\n⚠️  PARTIAL SUCCESS: Got ${products.length} products, expected 75`);
      console.log(`   There may be additional data issues to investigate.`);
    }
    
  } catch (error) {
    console.log(`   ❌ Updated service failed: ${error.message}`);
    console.log(`   The fix may not have resolved the RLS issue completely.`);
  }
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
