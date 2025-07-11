#!/usr/bin/env node

/**
 * Verify Tiramisu Fix Script
 * 
 * This script verifies that the Tiramisu pricing fix is working correctly
 * by checking both the recipe and product catalog entries.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function verifyTiramisuFix() {
  console.log('🔍 Verifying Tiramisu pricing fix...\n');
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  
  // Step 1: Check recipe templates
  console.log('📋 Checking Tiramisu recipe templates...');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=*&name=ilike.*Tiramisu*',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  console.log(`✅ Found ${templates.length} Tiramisu templates`);
  
  for (const template of templates) {
    console.log(`   📋 Template: ${template.name} (${template.category_name}) - ₱${template.suggested_price}`);
    
    if (template.category_name === 'classic' || template.category_name === 'Classic') {
      if (template.suggested_price === 125) {
        console.log(`   ✅ Template price is correct: ₱125`);
      } else {
        console.log(`   ❌ Template price is wrong: ₱${template.suggested_price} (should be ₱125)`);
      }
    }
  }
  
  // Step 2: Check deployed recipes
  console.log('\n🏪 Checking deployed recipes...');
  for (const template of templates) {
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*,stores(name)&template_id=eq.${template.id}`,
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    
    for (const recipe of recipes) {
      const storeName = recipe.stores?.name || 'Unknown Store';
      console.log(`   📍 Recipe in ${storeName}: ₱${recipe.suggested_price}`);
      
      if (template.category_name === 'classic' || template.category_name === 'Classic') {
        if (recipe.suggested_price === 125) {
          console.log(`   ✅ Recipe price is correct: ₱125`);
        } else {
          console.log(`   ❌ Recipe price is wrong: ₱${recipe.suggested_price} (should be ₱125)`);
        }
      }
      
      // Step 3: Check product catalog entries
      const catalogOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/product_catalog?select=*&recipe_id=eq.${recipe.id}`,
        method: 'GET',
        headers
      };
      
      const catalogEntries = await makeRequest(catalogOptions);
      
      if (catalogEntries.length > 0) {
        const catalogEntry = catalogEntries[0];
        console.log(`   📦 Product catalog: ₱${catalogEntry.price} (Available: ${catalogEntry.is_available})`);
        
        if (template.category_name === 'classic' || template.category_name === 'Classic') {
          if (catalogEntry.price === 125) {
            console.log(`   ✅ Catalog price is correct: ₱125`);
          } else {
            console.log(`   ❌ Catalog price is wrong: ₱${catalogEntry.price} (should be ₱125)`);
          }
        }
      } else {
        console.log(`   ❌ No product catalog entry found for recipe ${recipe.id}`);
      }
    }
  }
  
  console.log('\n✅ Verification complete!');
  console.log('💡 If you see any issues above, please refresh the Product Catalog and POS pages.');
}

verifyTiramisuFix().catch(console.error);
