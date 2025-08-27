#!/usr/bin/env node

/**
 * Store Catalog Sync
 *
 * Deploys missing products to a store's product_catalog based on active recipe_templates.
 * - Filters to the 10 main POS categories
 * - Creates missing categories in `categories` for the store
 * - Inserts missing products into `product_catalog`
 * - Defaults to dry-run; pass --apply to write changes
 *
 * Usage:
 *   node scripts/syncStoreCatalogFromTemplates.cjs --store <STORE_ID> [--apply]
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const args = process.argv.slice(2);
const storeId = (() => {
  const idx = args.indexOf('--store');
  return idx !== -1 ? args[idx + 1] : null;
})();
const apply = args.includes('--apply');

if (!storeId) {
  console.error('Usage: node scripts/syncStoreCatalogFromTemplates.cjs --store <STORE_ID> [--apply]');
  process.exit(1);
}

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

// Category mapping and filtering
const MAIN_POS_CATEGORIES = new Set(['Classic','Cold','Blended','Beverages','Add-on','Espresso','Fruity','Glaze','Mix & Match','Premium']);
function createTitleCase(str) {
  return String(str || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
function getPOSCategoryName(templateCategory) {
  const t = String(templateCategory || '').toLowerCase();
  if (t === 'classic') return 'Classic';
  if (t === 'addon' || t === 'add-on' || t === 'add-ons' || t === 'add ons') return 'Add-on';
  if (t === 'beverages' || t === 'beverage') return 'Beverages';
  if (t === 'espresso') return 'Espresso';
  if (t === 'combo') return 'Combo';
  if (t === 'premium') return 'Premium';
  if (t === 'fruity') return 'Fruity';
  if (t === 'glaze') return 'Glaze';
  if (t === 'mix & match' || t === 'mix and match' || t === 'mix_match' || t === 'mix-match') return 'Mix & Match';
  if (t === 'cold') return 'Cold';
  if (t === 'others' || t === 'other') return 'Beverages';
  return createTitleCase(templateCategory);
}

async function ensureCategories(categoryNames) {
  const { existing, byName } = await (async () => {
    const cats = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/categories?select=id,name&store_id=eq.${storeId}`,
      method: 'GET',
      headers
    });
    const map = new Map();
    (cats || []).forEach(c => map.set(c.name, c));
    return { existing: cats || [], byName: map };
  })();

  const results = {};
  for (const name of categoryNames) {
    if (byName.has(name)) {
      results[name] = byName.get(name).id;
      continue;
    }
    if (!apply) {
      console.log(`[dry-run] Would create category: ${name}`);
      continue;
    }
    const created = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/categories',
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' }
    }, [{ name, description: `Category for ${name}`, store_id: storeId, is_active: true }]);
    const id = created?.[0]?.id;
    console.log(`Created category: ${name} (${id})`);
    results[name] = id;
  }
  // Refresh IDs for any that existed but we didn't add
  for (const name of categoryNames) {
    if (!results[name] && byName.has(name)) results[name] = byName.get(name).id;
  }
  return results; // name -> id
}

async function main() {
  console.log('🔄 Store Catalog Sync');
  console.log(`   Store: ${storeId}`);
  console.log(`   Mode: ${apply ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}\n`);

  await auth();

  // Fetch active recipe templates (authoritative set)
  const templates = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name,is_active&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });

  // Normalize to main POS categories
  const mapped = (templates || [])
    .map(t => ({ ...t, posCategory: getPOSCategoryName(t.category_name) }))
    .filter(t => MAIN_POS_CATEGORIES.has(t.posCategory));

  // Fetch current product_catalog for the store
  const catalog = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,product_name,category_id,recipe_id,is_available,product_status&store_id=eq.${storeId}`,
    method: 'GET',
    headers
  });

  const existingNames = new Set((catalog || []).map(p => (p.product_name || '').trim().toLowerCase()));
  const missing = mapped.filter(t => !existingNames.has((t.name || '').trim().toLowerCase()));

  console.log(`📊 Templates (active, main categories): ${mapped.length}`);
  console.log(`📦 In product_catalog: ${(catalog || []).length}`);
  console.log(`❌ Missing to deploy: ${missing.length}`);

  if (!missing.length) {
    console.log('\n✅ Nothing to deploy.');
    return;
  }

  // Ensure categories exist and collect IDs
  const neededCategoryNames = [...new Set(missing.map(t => t.posCategory))];
  const categoryIdByName = await ensureCategories(neededCategoryNames);

  const rows = missing.map((t, idx) => ({
    product_name: t.name,
    description: null,
    price: 0, // TODO: set actual price strategy after pricing matrix is finalized
    category_id: categoryIdByName[t.posCategory] || null,
    store_id: storeId,
    image_url: null,
    is_available: false, // default off; staff can enable
    product_status: 'temporarily_unavailable',
    recipe_id: null,
    display_order: (catalog?.length || 0) + idx + 1
  }));

  if (!apply) {
    console.log('\n[dry-run] Would insert the following products:');
    rows.forEach(r => console.log(`   - ${r.product_name} (category_id=${r.category_id || 'none'})`));
    console.log('\nRun with --apply to write changes.');
    return;
  }

  const inserted = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/product_catalog',
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' }
  }, rows);

  console.log(`\n✅ Inserted ${inserted.length} products into product_catalog.`);
  inserted.forEach(p => console.log(`   + ${p.product_name} (${p.id})`));
}

main().catch(err => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
