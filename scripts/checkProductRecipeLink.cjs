#!/usr/bin/env node

/**
 * Read-only check: product_catalog ↔ recipes ↔ recipe_templates mapping for a given product name
 * Also checks product_ingredients mapping for each matching catalog entry.
 * Usage:
 *   node scripts/checkProductRecipeLink.cjs "Cookies Cream Croffle"
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

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          if (!body || body.trim() === '') return resolve(null);
          const json = JSON.parse(body);
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${json.message || body}`));
          resolve(json);
        } catch (e) { reject(new Error(`Parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
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
  const res = await request(options, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers.Authorization = `Bearer ${res.access_token}`;
}

function norm(s) { return (s||'').replace(/\s+/g, ' ').trim(); }

async function findCatalogByName(name) {
  // exact
  let options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,store_id,product_name,price,recipe_id,updated_at&product_name=eq.${encodeURIComponent(name)}`,
    method: 'GET',
    headers
  };
  let rows = await request(options);
  if (rows && rows.length) return rows;

  // ilike fallback
  const pattern = `*${encodeURIComponent(norm(name))}*`;
  options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,store_id,product_name,price,recipe_id,updated_at&product_name=ilike.${pattern}&limit=20`,
    method: 'GET',
    headers
  };
  rows = await request(options);
  return rows || [];
}

async function loadRecipe(recipeId) {
  if (!recipeId) return null;
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipes?select=id,name,template_id,is_active&id=eq.${recipeId}`,
    method: 'GET',
    headers
  };
  const rows = await request(options);
  return rows && rows[0];
}

async function loadTemplate(templateId) {
  if (!templateId) return null;
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_templates?select=id,name,is_active&id=eq.${templateId}`,
    method: 'GET',
    headers
  };
  const rows = await request(options);
  return rows && rows[0];
}

async function findTemplatesByName(name) {
  // exact
  let options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_templates?select=id,name,is_active&name=eq.${encodeURIComponent(name)}`,
    method: 'GET',
    headers
  };
  let rows = await request(options);
  if (rows && rows.length) return rows;

  // ilike
  const pattern = `*${encodeURIComponent(norm(name))}*`;
  options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_templates?select=id,name,is_active&name=ilike.${pattern}&limit=20`,
    method: 'GET',
    headers
  };
  rows = await request(options);
  return rows || [];
}

async function countProductIngredients(productCatalogId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=id&product_catalog_id=eq.${productCatalogId}`,
    method: 'GET',
    headers
  };
  const rows = await request(options);
  return (rows || []).length;
}

(async function main(){
  try {
    const nameArg = process.argv.slice(2).join(' ').trim();
    if (!nameArg) {
      console.log('Usage: node scripts/checkProductRecipeLink.cjs "Cookies Cream Croffle"');
      process.exit(1);
    }

    console.log('🔎 Checking product/recipe mapping for:', JSON.stringify(nameArg));
    await auth();

    const candidates = [nameArg, norm(nameArg), nameArg.replace(/\s/g, '  ')];
    const seenPC = new Map();

    for (const cand of candidates) {
      const rows = await findCatalogByName(cand);
      if (!rows || rows.length === 0) {
        console.log(`
— No product_catalog matches for: "${cand}"`);
        continue;
      }
      console.log(`
— product_catalog matches for: "${cand}" (${rows.length})`);
      for (const pc of rows) {
        if (seenPC.has(pc.id)) continue;
        seenPC.set(pc.id, true);
        const recipe = await loadRecipe(pc.recipe_id);
        const templ = await loadTemplate(recipe?.template_id);
        const piCount = await countProductIngredients(pc.id);
        console.log(`pc:${pc.id} store:${pc.store_id} name:"${pc.product_name}" recipe_id:${pc.recipe_id || 'NULL'} pi:${piCount}`);
        if (recipe) console.log(`  ↳ recipe: ${recipe.id} name:"${recipe.name}" template:${recipe.template_id} active:${recipe.is_active}`);
        if (templ) console.log(`     ↳ template: ${templ.id} name:"${templ.name}" active:${templ.is_active}`);
      }
    }

    // Check templates by name
    const tmplExact = await findTemplatesByName(nameArg);
    console.log(`
— recipe_templates by name ("${nameArg}") -> ${tmplExact.length} matches`);
    tmplExact.forEach(t => console.log(`template:${t.id} name:"${t.name}" active:${t.is_active}`));

    console.log('\n✅ Read-only mapping check complete.');
  } catch (e) {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  }
})();

