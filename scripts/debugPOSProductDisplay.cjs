#!/usr/bin/env node

/**
 * Debug POS Product Display
 * 
 * Investigates why the POS is only showing a subset of products
 * despite having 75 products in the database.
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const STORE_ID = 'fd45e07e-7832-4f51-b46b-7ef604359b86'; // Robinsons North

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

// Simulate POS filtering logic
function shouldDisplayCategoryInPOS(categoryName) {
  if (!categoryName) return true;
  const name = String(categoryName).toLowerCase();
  const hiddenCategories = ['desserts', 'other', 'others'];
  return !hiddenCategories.includes(name);
}

async function main() {
  console.log('🔍 DEBUG POS PRODUCT DISPLAY');
  console.log('=' .repeat(60));
  console.log(`Store: ${STORE_ID} (Robinsons North)`);
  
  await auth();

  // Fetch all products from product_catalog
  const products = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,product_name,description,price,category_id,store_id,image_url,is_available,product_status,recipe_id,display_order&store_id=eq.${STORE_ID}&order=display_order.asc.nullslast`,
    method: 'GET',
    headers
  });

  // Fetch categories
  const categories = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/categories?select=id,name,is_active&store_id=eq.${STORE_ID}`,
    method: 'GET',
    headers
  });

  const categoryMap = new Map();
  (categories || []).forEach(c => categoryMap.set(c.id, c.name));

  console.log(`\n📊 RAW DATA:`);
  console.log(`   Total products in DB: ${(products || []).length}`);
  console.log(`   Total categories: ${(categories || []).length}`);

  // Simulate the POS ProductGrid filtering logic
  console.log(`\n🔍 SIMULATING POS FILTERING LOGIC:`);
  
  const results = {
    total: (products || []).length,
    afterAvailabilityFilter: 0,
    afterCategoryFilter: 0,
    afterSearchFilter: 0,
    visible: []
  };

  let filtered = (products || []);

  // Step 1: Availability filter (isActive check)
  filtered = filtered.filter(product => {
    const isActive = !!product.is_available; // POS treats is_available as isActive
    return isActive;
  });
  results.afterAvailabilityFilter = filtered.length;
  console.log(`   After availability filter (is_available=true): ${filtered.length}`);

  // Step 2: Category display filter
  filtered = filtered.filter(product => {
    const categoryName = categoryMap.get(product.category_id) || '';
    const shouldDisplay = shouldDisplayCategoryInPOS(categoryName) && categoryName !== 'Combo';
    if (!shouldDisplay) {
      console.log(`     Filtered out: ${product.product_name} (category: ${categoryName})`);
    }
    return shouldDisplay;
  });
  results.afterCategoryFilter = filtered.length;
  console.log(`   After category filter: ${filtered.length}`);

  // Step 3: Search filter (empty search = show all)
  // No search term, so all pass through
  results.afterSearchFilter = filtered.length;
  results.visible = filtered;

  console.log(`\n📋 FILTERING RESULTS:`);
  console.log(`   Database total: ${results.total}`);
  console.log(`   After availability filter: ${results.afterAvailabilityFilter} (${results.total - results.afterAvailabilityFilter} hidden)`);
  console.log(`   After category filter: ${results.afterCategoryFilter} (${results.afterAvailabilityFilter - results.afterCategoryFilter} hidden)`);
  console.log(`   Final visible: ${results.afterSearchFilter}`);

  console.log(`\n✅ VISIBLE PRODUCTS (${results.visible.length}):`);
  results.visible.forEach((p, i) => {
    const categoryName = categoryMap.get(p.category_id) || 'No Category';
    console.log(`   ${i + 1}. ${p.product_name} (${categoryName}) - ₱${p.price} - ${p.is_available ? 'Available' : 'Unavailable'}`);
  });

  console.log(`\n❌ HIDDEN PRODUCTS ANALYSIS:`);
  const hiddenByAvailability = (products || []).filter(p => !p.is_available);
  console.log(`   Hidden by availability (is_available=false): ${hiddenByAvailability.length}`);
  
  if (hiddenByAvailability.length > 0) {
    console.log(`   First 10 unavailable products:`);
    hiddenByAvailability.slice(0, 10).forEach(p => {
      const categoryName = categoryMap.get(p.category_id) || 'No Category';
      console.log(`     - ${p.product_name} (${categoryName}) - Status: ${p.product_status}`);
    });
  }

  const availableProducts = (products || []).filter(p => p.is_available);
  const hiddenByCategory = availableProducts.filter(p => {
    const categoryName = categoryMap.get(p.category_id) || '';
    return !shouldDisplayCategoryInPOS(categoryName) || categoryName === 'Combo';
  });
  
  console.log(`   Hidden by category filter: ${hiddenByCategory.length}`);
  if (hiddenByCategory.length > 0) {
    console.log(`   Products hidden by category:`);
    hiddenByCategory.forEach(p => {
      const categoryName = categoryMap.get(p.category_id) || 'No Category';
      console.log(`     - ${p.product_name} (${categoryName})`);
    });
  }

  console.log(`\n🎯 ROOT CAUSE ANALYSIS:`);
  if (results.total - results.afterAvailabilityFilter > 0) {
    console.log(`   ❌ PRIMARY ISSUE: ${results.total - results.afterAvailabilityFilter} products hidden by availability filter`);
    console.log(`      The POS filters out products where is_available=false`);
    console.log(`      These are the 37 products we just added (marked as temporarily_unavailable)`);
  }
  
  if (results.afterAvailabilityFilter - results.afterCategoryFilter > 0) {
    console.log(`   ⚠️  SECONDARY ISSUE: ${results.afterAvailabilityFilter - results.afterCategoryFilter} products hidden by category filter`);
  }

  console.log(`\n💡 SOLUTION:`);
  console.log(`   To show all 75 products in POS "All Items" view:`);
  console.log(`   1. Remove the is_available filter from ProductGrid "All Items" tab`);
  console.log(`   2. Show status badges instead (Available, Temporarily Unavailable, etc.)`);
  console.log(`   3. Add an optional "Show Active Only" toggle for filtering`);

  return results;
}

main().catch(err => {
  console.error('Debug failed:', err.message);
  process.exit(1);
});
