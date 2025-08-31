#!/usr/bin/env node
/**
 * Validate Mix & Match base product → recipe mapping
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

function req(opts) {
  return new Promise((resolve, reject) => {
    const resChunks = [];
    const r = https.request(opts, (res) => {
      res.on('data', (d) => resChunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(resChunks).toString('utf8');
        if (!body.trim()) return resolve(null);
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    r.on('error', reject); r.end();
  });
}

(async function main() {
  console.log('🔍 VALIDATING MIX & MATCH RECIPE MAPPING');
  console.log('='.repeat(50));

  // Find Mix & Match base products
  const path = `/rest/v1/product_catalog?select=id,product_name,recipe_id,store_id&is_available=eq.true&limit=100`;
  const products = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  
  const mixMatchProducts = (products || []).filter(p => 
    p.product_name.toLowerCase().includes('croffle overload') ||
    p.product_name.toLowerCase().includes('mini croffle')
  );
  
  console.log(`Mix & Match base products found: ${mixMatchProducts.length}`);
  
  for (const product of mixMatchProducts) {
    console.log(`\n📦 ${product.product_name}`);
    console.log(`   ID: ${product.id}`);
    console.log(`   Recipe ID: ${product.recipe_id || 'null'}`);
    
    if (product.recipe_id) {
      // Check recipe → template mapping
      const recipePath = `/rest/v1/recipes?select=template_id,name&id=eq.${product.recipe_id}`;
      const recipeRows = await req({ hostname: SUPABASE_URL, port: 443, path: recipePath, method: 'GET', headers });
      const recipe = recipeRows && recipeRows[0];
      
      if (recipe && recipe.template_id) {
        console.log(`   ✅ Template ID: ${recipe.template_id}`);
        
        // Get template ingredients
        const templatePath = `/rest/v1/recipe_template_ingredients?select=ingredient_name,quantity,unit&recipe_template_id=eq.${recipe.template_id}`;
        const ingredients = await req({ hostname: SUPABASE_URL, port: 443, path: templatePath, method: 'GET', headers });
        
        if (ingredients && ingredients.length > 0) {
          console.log(`   ✅ Base ingredients (${ingredients.length}):`);
          ingredients.forEach(ing => {
            console.log(`      - ${ing.ingredient_name} (${ing.quantity} ${ing.unit})`);
          });
        } else {
          console.log(`   ❌ No ingredients found for template`);
        }
      } else {
        console.log(`   ❌ No template_id found in recipes table`);
      }
    } else {
      console.log(`   ❌ No recipe_id - base ingredients not linked`);
    }
  }
  
  console.log('\n🎯 RECOMMENDATION:');
  const missingRecipeId = mixMatchProducts.filter(p => !p.recipe_id);
  if (missingRecipeId.length > 0) {
    console.log(`❌ ${missingRecipeId.length} Mix & Match products missing recipe_id`);
    console.log('   Fix: Link these products to their base recipe templates');
  } else {
    console.log('✅ All Mix & Match products have recipe_id links');
    console.log('   Issue is likely in the deduction service logic');
  }
})();
