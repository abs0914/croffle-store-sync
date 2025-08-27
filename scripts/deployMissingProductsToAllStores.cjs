#!/usr/bin/env node

/**
 * Deploy Missing Products to All Stores
 *
 * Runs the syncStoreCatalogFromTemplates script for all stores that are missing products.
 * This will ensure all stores have a complete product catalog based on active recipe templates.
 *
 * Usage:
 *   node scripts/deployMissingProductsToAllStores.cjs [--apply]
 */

const { execSync } = require('child_process');
const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const apply = process.argv.includes('--apply');

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

async function getStoresWithProductCounts() {
  const query = `
    SELECT 
      s.id,
      s.name,
      s.is_active,
      COUNT(pc.id) as product_count
    FROM stores s
    LEFT JOIN product_catalog pc ON s.id = pc.store_id
    WHERE s.is_active = true
    GROUP BY s.id, s.name, s.is_active
    ORDER BY product_count ASC, s.name
  `;
  
  return await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/rpc/sql_query`,
    method: 'POST',
    headers
  }, { query });
}

async function getActiveTemplateCount() {
  const templates = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/recipe_templates?select=id&is_active=eq.true',
    method: 'GET',
    headers
  });
  return templates.length;
}

async function runSyncForStore(storeId, storeName) {
  console.log(`\n🔄 Syncing store: ${storeName} (${storeId})`);
  
  try {
    const command = `node scripts/syncStoreCatalogFromTemplates.cjs --store ${storeId}${apply ? ' --apply' : ''}`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
    return { success: true, output };
  } catch (error) {
    console.error(`❌ Error syncing ${storeName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function validateResults() {
  console.log('\n📊 Validating results...');
  
  const stores = await getStoresWithProductCounts();
  const expectedCount = await getActiveTemplateCount();
  
  console.log(`\nExpected products per store: ${expectedCount}`);
  console.log('\nFinal product counts:');
  
  let allComplete = true;
  for (const store of stores) {
    const status = store.product_count >= expectedCount ? '✅' : '⚠️';
    console.log(`  ${status} ${store.name}: ${store.product_count}/${expectedCount} products`);
    if (store.product_count < expectedCount) {
      allComplete = false;
    }
  }
  
  return allComplete;
}

async function main() {
  console.log('🚀 Deploying Missing Products to All Stores');
  console.log(`   Mode: ${apply ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}\n`);
  
  await auth();
  
  // Get current state
  const stores = await getStoresWithProductCounts();
  const expectedCount = await getActiveTemplateCount();
  
  console.log(`📋 Found ${stores.length} active stores`);
  console.log(`📦 Expected products per store: ${expectedCount}\n`);
  
  // Identify stores that need sync
  const storesToSync = stores.filter(store => store.product_count < expectedCount);
  
  if (storesToSync.length === 0) {
    console.log('✅ All stores already have complete product catalogs!');
    return;
  }
  
  console.log(`🎯 Found ${storesToSync.length} stores needing product deployment:`);
  for (const store of storesToSync) {
    console.log(`   - ${store.name}: ${store.product_count}/${expectedCount} products (missing ${expectedCount - store.product_count})`);
  }
  
  if (!apply) {
    console.log('\n⚠️  This is a DRY-RUN. Add --apply to execute changes.');
  }
  
  // Run sync for each store
  const results = [];
  for (const store of storesToSync) {
    const result = await runSyncForStore(store.id, store.name);
    results.push({ store: store.name, ...result });
  }
  
  // Summary
  console.log('\n📈 Deployment Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed deployments:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.store}: ${r.error}`);
    });
  }
  
  // Validate final state
  if (apply && successful > 0) {
    const allComplete = await validateResults();
    
    if (allComplete) {
      console.log('\n🎉 SUCCESS: All stores now have complete product catalogs!');
    } else {
      console.log('\n⚠️  Some stores still have incomplete catalogs. Manual investigation may be needed.');
    }
  }
}

main().catch(err => {
  console.error('Deployment failed:', err.message);
  process.exit(1);
});