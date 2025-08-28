#!/usr/bin/env node

/**
 * Read-only checks for product-catalog → recipe → recipe_template mapping and duplicates.
 * - Lists products missing recipes/templates or with inactive templates
 * - Checks name mismatches between product_catalog.product_name and recipe_templates.name
 * - Detects duplicate product_catalog rows by (store_id, product_name)
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

async function fetchAllProductCatalog() {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,store_id,product_name,recipe_id,is_available,updated_at`,
    method: 'GET',
    headers
  };
  return await request(options);
}

// Helper: split an array of UUIDs into chunks to avoid long query params
function chunk(arr, size) { const out = []; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i, i+size)); return out; }

async function fetchRecipesByIds(ids) {
  if (!ids.length) return [];
  const chunks = chunk(ids, 100); // avoid exceeding URL length
  let all = [];
  for (const ch of chunks) {
    const inClause = ch.map(encodeURIComponent).join(',');
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/recipes?select=id,template_id,name,is_active&id=in.(${inClause})`,
      method: 'GET',
      headers
    };
    const part = await request(options);
    all = all.concat(part || []);
  }
  return all;
}

async function fetchTemplatesByIds(ids) {
  if (!ids.length) return [];
  const chunks = chunk(ids, 100);
  let all = [];
  for (const ch of chunks) {
    const inClause = ch.map(encodeURIComponent).join(',');
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/recipe_templates?select=id,name,is_active&id=in.(${inClause})`,
      method: 'GET',
      headers
    };
    const part = await request(options);
    all = all.concat(part || []);
  }
  return all;
}

function normalizeName(s) {
  return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function run() {
  console.log('🔍 Running read-only catalog mapping and duplicate checks...');
  await auth();

  const catalog = await fetchAllProductCatalog();
  console.log(`📦 product_catalog rows: ${catalog?.length || 0}`);

  const byId = new Map(catalog.map(c => [c.id, c]));
  const recipeIds = [...new Set(catalog.map(c => c.recipe_id).filter(Boolean))];

  const recipes = await fetchRecipesByIds(recipeIds);
  const recipesById = new Map(recipes.map(r => [r.id, r]));
  const templateIds = [...new Set(recipes.map(r => r.template_id).filter(Boolean))];
  const templates = await fetchTemplatesByIds(templateIds);
  const templatesById = new Map(templates.map(t => [t.id, t]));

  // 1) Missing recipe links or missing/inactive templates
  const missingRecipe = catalog.filter(c => !c.recipe_id || !recipesById.get(c.recipe_id));
  const missingOrInactiveTemplate = catalog.filter(c => {
    const r = c.recipe_id ? recipesById.get(c.recipe_id) : null;
    if (!r) return false; // already covered in missingRecipe
    const t = r.template_id ? templatesById.get(r.template_id) : null;
    return !t || t.is_active === false;
  });

  // 2) Name mismatches between product_name and template.name (exactness)
  const nameMismatch = catalog.filter(c => {
    const r = c.recipe_id ? recipesById.get(c.recipe_id) : null;
    const t = r?.template_id ? templatesById.get(r.template_id) : null;
    if (!t) return false; // already reported above
    const prod = normalizeName(c.product_name);
    const tmpl = normalizeName(t.name);
    return prod !== tmpl;
  });

  // 3) Duplicates by (store_id, product_name)
  const dupMap = new Map();
  for (const c of catalog) {
    const key = `${c.store_id}::${normalizeName(c.product_name)}`;
    dupMap.set(key, (dupMap.get(key) || []).concat([c]));
  }
  const duplicates = [...dupMap.values()].filter(arr => arr.length > 1);

  // Output summary
  console.log('\n===== SUMMARY =====');
  console.log(`Missing recipe link or recipe missing: ${missingRecipe.length}`);
  console.log(`Missing/inactive template: ${missingOrInactiveTemplate.length}`);
  console.log(`Name mismatch (product vs template): ${nameMismatch.length}`);
  console.log(`Duplicate product_catalog (store+name): ${duplicates.length}`);

  // Show a few examples for each category
  function showSample(title, rows, mapper) {
    console.log(`\n--- ${title} (showing up to 10) ---`);
    rows.slice(0, 10).forEach((row, i) => {
      console.log(`${i+1}. ${mapper(row)}`);
    });
  }

  showSample('Missing recipe link', missingRecipe, (c) => `pc:${c.id} store:${c.store_id} name:"${c.product_name}"`);
  showSample('Missing/inactive template', missingOrInactiveTemplate, (c) => {
    const r = recipesById.get(c.recipe_id);
    const t = r && templatesById.get(r.template_id);
    return `pc:${c.id} name:"${c.product_name}" recipe:${r?.id || 'N/A'} template:${t?.id || 'N/A'} active:${t?.is_active}`;
  });
  showSample('Name mismatch', nameMismatch, (c) => {
    const r = recipesById.get(c.recipe_id);
    const t = r && templatesById.get(r.template_id);
    return `pc:${c.id} store:${c.store_id} product:"${c.product_name}" template:"${t?.name}"`;
  });

  console.log('\n--- Duplicate groups (showing up to 5 groups) ---');
  duplicates.slice(0, 5).forEach((group, gi) => {
    console.log(`Group ${gi+1}: store:${group[0].store_id} name:"${group[0].product_name}" count:${group.length}`);
    group.forEach((c, i) => console.log(`   - pc:${c.id} updated_at:${c.updated_at}`));
  });
}

run().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });

