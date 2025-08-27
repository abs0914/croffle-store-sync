#!/usr/bin/env node

/**
 * Enable New Products
 * 
 * Sets the 37 newly added products to is_available=true so they show in POS
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const STORE_ID = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

const args = process.argv.slice(2);
const apply = args.includes('--apply');

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
          if (res.statusCode >= 400) return reject(new Error(json?.message || body));
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
  console.log('🔄 Enable New Products');
  console.log(`   Store: ${STORE_ID}`);
  console.log(`   Mode: ${apply ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}\n`);

  await auth();

  // Get unavailable products (the 37 we just added)
  const unavailableProducts = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,product_name,is_available,product_status&store_id=eq.${STORE_ID}&is_available=eq.false`,
    method: 'GET',
    headers
  });

  console.log(`📊 Found ${unavailableProducts.length} unavailable products`);

  if (!apply) {
    console.log('\n[dry-run] Would enable the following products:');
    unavailableProducts.forEach(p => console.log(`   - ${p.product_name} (${p.product_status})`));
    console.log('\nRun with --apply to enable these products.');
    return;
  }

  if (unavailableProducts.length === 0) {
    console.log('✅ No products to enable.');
    return;
  }

  // Enable all unavailable products
  const productIds = unavailableProducts.map(p => p.id);
  
  const updated = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?id=in.(${productIds.join(',')})`,
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' }
  }, {
    is_available: true,
    product_status: 'available'
  });

  console.log(`\n✅ Enabled ${updated.length} products.`);
  updated.forEach(p => console.log(`   + ${p.product_name} is now available`));
  
  console.log(`\n🎯 Result: POS should now show all 75 products!`);
}

main().catch(err => {
  console.error('Enable failed:', err.message);
  process.exit(1);
});
