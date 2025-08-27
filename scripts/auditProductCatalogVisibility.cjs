#!/usr/bin/env node

/**
 * Audit Product Catalog Visibility
 *
 * Compares product_catalog rows for a store vs. what's visible in the POS ProductGrid
 * and explains why items are hidden (is_available=false, category excluded, etc.).
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

// Simulate shouldDisplayCategoryInPOS: hide "desserts", "other(s)"; allow Add-on; hide Combo specially
function shouldDisplayCategoryInPOS(name) {
  if (!name) return true;
  const n = String(name).toLowerCase();
  if (n === 'combo') return false;
  return !(n === 'desserts' || n === 'other' || n === 'others');
}

async function loadCategories() {
  const cats = await req({
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/categories?select=id,name&store_id=eq.${STORE_ID}`,
    method: 'GET',
    headers
  });
  const map = new Map();
  (cats || []).forEach(c => map.set(c.id, c.name));
  return map;
}

async function main() {
  try {
    console.log('🔍 Auditing product catalog visibility for store:', STORE_ID);
    await auth();

    // Load products
    const products = await req({
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,description,price,category_id,store_id,image_url,is_available,product_status,recipe_id&store_id=eq.${STORE_ID}&order=display_order.asc`,
      method: 'GET',
      headers
    });

    // Load categories map id -> name
    const categoryNameById = await loadCategories();

    const total = (products || []).length;

    // Simulate ProductGrid filter logic for the All Items tab with empty search
    const hidden = []; const visible = [];
    for (const p of (products || [])) {
      const isActive = !!p.is_available; // ProductGrid treats is_available as active
      const categoryName = categoryNameById.get(p.category_id) || '';
      const shouldDisplayCategory = shouldDisplayCategoryInPOS(categoryName) && categoryName !== 'Combo';
      const matchesCategory = true; // All tab
      const matchesSearch = true;   // empty search

      const passes = isActive && shouldDisplayCategory && matchesCategory && matchesSearch;
      (passes ? visible : hidden).push({
        id: p.id,
        name: p.product_name,
        is_available: p.is_available,
        product_status: p.product_status,
        category_id: p.category_id,
        category_name: categoryName
      });
    }

    // Group hidden by reason
    const reasons = {
      unavailable: [],
      excludedCategory: [],
    };

    hidden.forEach(p => {
      if (!p.is_available) reasons.unavailable.push(p);
      else reasons.excludedCategory.push(p);
    });

    console.log('\n📊 Counts');
    console.log(`   Total in DB: ${total}`);
    console.log(`   Visible by UI filter: ${visible.length}`);
    console.log(`   Hidden by UI filter: ${hidden.length}`);

    console.log('\n❌ Hidden because is_available=false:', reasons.unavailable.length);
    reasons.unavailable.slice(0, 50).forEach(p => console.log(`   - ${p.name} [status=${p.product_status}]`));

    console.log('\n❌ Hidden due to excluded category:', reasons.excludedCategory.length);
    reasons.excludedCategory.slice(0, 50).forEach(p => console.log(`   - ${p.name} (category=${p.category_name || 'none'})`));

    // Show delta summary for troubleshooting
    const missingCount = hidden.length;
    console.log(`\n🎯 Summary: ${visible.length} visible, ${missingCount} hidden of ${total}`);

  } catch (e) {
    console.error('Audit failed:', e.message);
    process.exit(1);
  }
}

main();
