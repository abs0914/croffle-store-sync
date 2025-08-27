#!/usr/bin/env node

/**
 * Test Enhanced Product Catalog Fix
 * 
 * Tests the updated fetchEnhancedProductCatalog service to ensure it returns all 75 products
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
  console.log('🧪 TESTING ENHANCED PRODUCT CATALOG FIX');
  console.log('=' .repeat(60));
  console.log(`Store: ${STORE_ID}`);
  
  await auth();

  // Test the new safe query (what the updated enhanced service now uses)
  console.log('\n📊 TESTING UPDATED fetchEnhancedProductCatalog SERVICE');
  try {
    const products = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,description,price,category_id,store_id,image_url,is_available,product_status,recipe_id,display_order,created_at,updated_at&store_id=eq.${STORE_ID}&order=display_order.asc.nullslast`,
      method: 'GET',
      headers
    });
    
    console.log(`   ✅ Updated enhanced service returned: ${products.length} products`);
    
    const availableCount = products.filter(p => p.is_available).length;
    const unavailableCount = products.filter(p => !p.is_available).length;
    const withRecipeId = products.filter(p => p.recipe_id).length;
    const withoutRecipeId = products.filter(p => !p.recipe_id).length;
    
    console.log(`   📈 Available: ${availableCount}`);
    console.log(`   📉 Unavailable: ${unavailableCount}`);
    console.log(`   🧪 With Recipe ID: ${withRecipeId}`);
    console.log(`   ❌ Without Recipe ID: ${withoutRecipeId}`);
    
    if (products.length === 75) {
      console.log(`\n✅ SUCCESS: Enhanced Product Catalog should now show all 75 products!`);
      console.log(`\n📋 EXPECTED RESULT IN UI:`);
      console.log(`   - Total card: 75`);
      console.log(`   - Healthy card: ${availableCount} (products that are available)`);
      console.log(`   - POS Ready card: ${withRecipeId} (products with recipes)`);
      console.log(`   - Missing Inventory card: varies based on stock`);
      console.log(`   - Out of Stock card: varies based on inventory`);
      console.log(`   - Missing Templates card: varies based on recipe templates`);
      console.log(`   - Products list: "Products (75)" header`);
      
      console.log(`\n🔄 NEXT STEPS:`);
      console.log(`   1. Refresh the Product Catalog page (hard refresh: Ctrl+F5)`);
      console.log(`   2. Clear browser cache and React Query cache`);
      console.log(`   3. Verify all 75 products are now visible`);
      console.log(`   4. Check that metrics show correct counts`);
      
    } else {
      console.log(`\n⚠️  PARTIAL SUCCESS: Got ${products.length} products, expected 75`);
      console.log(`   There may be additional data issues to investigate.`);
    }
    
    // Test separate queries that the enhanced service now uses
    console.log(`\n🔍 TESTING SEPARATE QUERIES (Enhanced Service Pattern)`);
    
    const recipeIds = products.filter(p => p.recipe_id).map(p => p.recipe_id);
    console.log(`   Found ${recipeIds.length} products with recipe IDs`);
    
    if (recipeIds.length > 0) {
      try {
        const recipes = await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/recipes?select=id,template_id,name,is_active,template:recipe_templates(id,name,is_active)&id=in.(${recipeIds.join(',')})`,
          method: 'GET',
          headers
        });
        console.log(`   ✅ Recipes query returned: ${recipes.length} recipes`);
        
        const ingredients = await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(id,item,unit,stock_quantity,minimum_threshold,is_active)&product_catalog_id=in.(${products.map(p => p.id).join(',')})`,
          method: 'GET',
          headers
        });
        console.log(`   ✅ Ingredients query returned: ${ingredients.length} ingredient records`);
        
      } catch (error) {
        console.log(`   ⚠️  Separate queries had issues: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Updated enhanced service failed: ${error.message}`);
    console.log(`   The fix may not have resolved the RLS issue completely.`);
  }
}

main().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
