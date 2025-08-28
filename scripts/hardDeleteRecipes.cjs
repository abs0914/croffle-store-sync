#!/usr/bin/env node

/**
 * Hard Delete Recipes (Fresh Start)
 *
 * Deletes ALL rows from:
 *  - recipe_deployments (if exists)
 *  - recipe_ingredients
 *  - recipes
 *
 * Keeps recipe_templates and recipe_template_ingredients intact (you just re-imported them).
 * Categories and product_catalog recipe links were already cleared by safeClear.
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

function req(options, data = null) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed?.message || body}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          // Not JSON
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          else resolve(body);
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function auth() {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  };
  const out = await req(options, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers = { ...headers, Authorization: `Bearer ${out.access_token}` };
}

async function tableExists(table) {
  // Lightweight probe using OPTIONS on PostgREST isn't available; try a HEAD/GET small select
  try {
    await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/${table}?select=id&limit=1`,
      method: 'GET',
      headers
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function deleteAll(table, filter = '') {
  const path = `/rest/v1/${table}${filter}`;
  await req({
    hostname: SUPABASE_URL,
    port: 443,
    path,
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=representation' }
  });
}

async function count(table) {
  const data = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/${table}?select=id`,
    method: 'GET',
    headers
  });
  return Array.isArray(data) ? data.length : 0;
}

async function main() {
  console.log('🗑️ HARD DELETE RECIPES (Fresh Start)');
  console.log('='.repeat(50));
  await auth();

  // 1) Optional: delete from recipe_deployments if table exists
  const hasDeployments = await tableExists('recipe_deployments');
  if (hasDeployments) {
    const before = await count('recipe_deployments');
    if (before > 0) {
      console.log(`   🔻 Deleting ${before} recipe_deployments...`);
      await deleteAll('recipe_deployments', '?id=neq.00000000-0000-0000-0000-000000000000');
    } else {
      console.log('   ✅ No recipe_deployments to delete');
    }
  } else {
    console.log('   ℹ️ recipe_deployments table not found (skipping)');
  }

  // 2) Delete recipe_ingredients first (FK to recipes)
  const ingBefore = await count('recipe_ingredients');
  if (ingBefore > 0) {
    console.log(`   🔻 Deleting ${ingBefore} recipe_ingredients...`);
    await deleteAll('recipe_ingredients', '?id=neq.00000000-0000-0000-0000-000000000000');
  } else {
    console.log('   ✅ No recipe_ingredients to delete');
  }

  // 3) Delete recipes
  const recBefore = await count('recipes');
  if (recBefore > 0) {
    console.log(`   🔻 Deleting ${recBefore} recipes...`);
    await deleteAll('recipes', '?id=neq.00000000-0000-0000-0000-000000000000');
  } else {
    console.log('   ✅ No recipes to delete');
  }

  // Verify
  const [ingAfter, recAfter] = await Promise.all([
    count('recipe_ingredients'),
    count('recipes')
  ]);

  console.log('\n🔍 Verification:');
  console.log(`   recipe_ingredients: ${ingAfter}`);
  console.log(`   recipes: ${recAfter}`);

  if (recAfter === 0) {
    console.log('\n✅ Hard delete complete. You can now run deployment.');
  } else {
    console.log('\n⚠️ Some recipes remain. Please re-run or check RLS/permissions.');
  }
}

main().catch((e) => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});

