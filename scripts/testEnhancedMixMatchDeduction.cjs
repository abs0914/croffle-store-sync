#!/usr/bin/env node
/**
 * Test Enhanced Mix & Match Inventory Deduction
 * Simulates a Mix & Match transaction to verify base ingredient deduction
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

function req(opts, data = null) {
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
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function findMixMatchProducts() {
  const path = `/rest/v1/product_catalog?select=id,product_name,recipe_id,store_id&is_available=eq.true&limit=50`;
  const products = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  
  return (products || []).filter(p => 
    p.product_name.toLowerCase().includes('croffle overload') ||
    p.product_name.toLowerCase().includes('mini croffle')
  );
}

async function getAddonProducts() {
  const path = `/rest/v1/product_catalog?select=id,product_name&is_available=eq.true&limit=100`;
  const products = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  
  const addonNames = ['marshmallow', 'choco flakes', 'tiramisu', 'colored sprinkles'];
  return (products || []).filter(p => 
    addonNames.some(addon => p.product_name.toLowerCase().includes(addon))
  );
}

async function testDeductionLogic(baseProduct, addons, storeId) {
  console.log(`\n🧪 TESTING DEDUCTION LOGIC`);
  console.log(`   Base: ${baseProduct.product_name}`);
  console.log(`   Add-ons: ${addons.map(a => a.product_name).join(', ')}`);
  
  // Simulate transaction items as they would appear in the deduction service
  const transactionItems = [
    // Base product with composite name (as it appears in POS)
    {
      product_id: baseProduct.id,
      name: `${baseProduct.product_name} with ${addons.map(a => a.product_name).join(' and ')}`,
      quantity: 1,
      unit_price: 150,
      total_price: 150
    },
    // Add-on items (as expanded by streamlined transaction service)
    ...addons.map(addon => ({
      product_id: addon.id,
      name: addon.product_name,
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }))
  ];
  
  console.log(`\n📋 Simulated transaction items:`);
  transactionItems.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.name} (product_id: ${item.product_id})`);
  });
  
  // Test base product recipe resolution
  console.log(`\n🔍 Testing base product recipe resolution:`);
  
  if (baseProduct.recipe_id) {
    console.log(`   ✅ Base product has recipe_id: ${baseProduct.recipe_id}`);
    
    // Check recipe → template mapping
    const recipePath = `/rest/v1/recipes?select=template_id,name&id=eq.${baseProduct.recipe_id}`;
    const recipeRows = await req({ hostname: SUPABASE_URL, port: 443, path: recipePath, method: 'GET', headers });
    const recipe = recipeRows && recipeRows[0];
    
    if (recipe && recipe.template_id) {
      console.log(`   ✅ Recipe links to template_id: ${recipe.template_id}`);
      
      // Get template ingredients
      const templatePath = `/rest/v1/recipe_template_ingredients?select=ingredient_name,quantity,unit&recipe_template_id=eq.${recipe.template_id}`;
      const ingredients = await req({ hostname: SUPABASE_URL, port: 443, path: templatePath, method: 'GET', headers });
      
      if (ingredients && ingredients.length > 0) {
        console.log(`   ✅ Base ingredients found (${ingredients.length}):`);
        ingredients.forEach(ing => {
          console.log(`      - ${ing.ingredient_name} (${ing.quantity} ${ing.unit})`);
        });
        
        console.log(`\n🎯 EXPECTED DEDUCTION BEHAVIOR:`);
        console.log(`   Base ingredients: ${ingredients.length} items should be deducted`);
        console.log(`   Add-on ingredients: ${addons.length} items should be deducted`);
        console.log(`   Total expected deductions: ${ingredients.length + addons.length}`);
        
        return {
          success: true,
          baseIngredients: ingredients.length,
          addonIngredients: addons.length,
          totalExpected: ingredients.length + addons.length
        };
      } else {
        console.log(`   ❌ No ingredients found for template`);
      }
    } else {
      console.log(`   ❌ Recipe missing template_id`);
    }
  } else {
    console.log(`   ❌ Base product missing recipe_id`);
  }
  
  return { success: false, baseIngredients: 0, addonIngredients: addons.length, totalExpected: addons.length };
}

(async function main() {
  console.log('🧪 TESTING ENHANCED MIX & MATCH DEDUCTION');
  console.log('='.repeat(60));

  // Find Mix & Match products
  const mixMatchProducts = await findMixMatchProducts();
  console.log(`Mix & Match products found: ${mixMatchProducts.length}`);
  
  if (mixMatchProducts.length === 0) {
    console.log('❌ No Mix & Match products found for testing');
    process.exit(1);
  }
  
  // Find add-on products
  const addonProducts = await getAddonProducts();
  console.log(`Add-on products found: ${addonProducts.length}`);
  
  if (addonProducts.length === 0) {
    console.log('❌ No add-on products found for testing');
    process.exit(1);
  }
  
  // Test with first available Mix & Match product
  const baseProduct = mixMatchProducts[0];
  const selectedAddons = addonProducts.slice(0, 2); // Use first 2 add-ons
  
  const testResult = await testDeductionLogic(baseProduct, selectedAddons, baseProduct.store_id);
  
  console.log(`\n📊 TEST SUMMARY:`);
  console.log(`   Base product resolution: ${testResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`   Expected base ingredient deductions: ${testResult.baseIngredients}`);
  console.log(`   Expected add-on deductions: ${testResult.addonIngredients}`);
  console.log(`   Total expected deductions: ${testResult.totalExpected}`);
  
  if (testResult.success) {
    console.log(`\n🎉 ENHANCED DEDUCTION SERVICE SHOULD WORK!`);
    console.log(`   The base product has proper recipe_id → template_id mapping`);
    console.log(`   Both base ingredients and add-ons should be deducted`);
  } else {
    console.log(`\n❌ DEDUCTION SERVICE NEEDS RECIPE SETUP`);
    console.log(`   Fix: Ensure Mix & Match products have recipe_id links`);
  }
  
  console.log(`\n🔧 To test with a real transaction:`);
  console.log(`   1. Create a Mix & Match order in POS`);
  console.log(`   2. Check the transaction logs for enhanced deduction messages`);
  console.log(`   3. Verify both base and add-on ingredients are deducted`);
})();
