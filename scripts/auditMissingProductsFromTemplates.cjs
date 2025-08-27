#!/usr/bin/env node

/**
 * Audit Missing Products from Recipe Templates
 *
 * Compares active recipe_templates (authoritative 61) to product_catalog entries
 * for a given store, using joins through recipes to find deployed templates.
 */

const https = require('https');

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
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers.Authorization = `Bearer ${authRes.access_token}`;
}

async function main() {
  try {
    console.log('🔍 Auditing missing products from active recipe templates for store:', STORE_ID);
    await auth();

    // Fetch all active recipe templates (authoritative list)
    const templates = await req({
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=id,name,category_name,is_active&is_active=eq.true&order=name.asc',
      method: 'GET',
      headers
    });

    // Fetch product_catalog with join to recipes->recipe_templates to know which templates are deployed in this store
    const catalog = await req({
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,recipe_id,recipes(template_id,recipe_templates(name,category_name))&store_id=eq.${STORE_ID}`,
      method: 'GET',
      headers
    });

    const totalTemplates = (templates || []).length;
    const deployedTemplates = new Set();

    (catalog || []).forEach(pc => {
      const tname = pc.recipes?.recipe_templates?.name;
      if (tname) deployedTemplates.add(tname);
    });

    // Some products might not have recipe links; try to match by product_name as fallback
    const templateNames = new Set((templates || []).map(t => t.name));
    (catalog || []).forEach(pc => {
      if (!pc.recipes?.recipe_templates?.name && templateNames.has(pc.product_name)) {
        deployedTemplates.add(pc.product_name);
      }
    });

    const missing = (templates || []).filter(t => !deployedTemplates.has(t.name));

    console.log('\n📊 Counts');
    console.log(`   Active templates (expected products): ${totalTemplates}`);
    console.log(`   Product catalog entries in store: ${(catalog || []).length}`);
    console.log(`   Deployed templates matched: ${deployedTemplates.size}`);
    console.log(`   Missing from product_catalog: ${missing.length}`);

    if (missing.length) {
      console.log('\n❌ Missing products (by template name):');
      missing.forEach(t => console.log(`   - ${t.name} [category=${t.category_name}]`));
    }

  } catch (e) {
    console.error('Audit failed:', e.message);
    process.exit(1);
  }
}

main();
