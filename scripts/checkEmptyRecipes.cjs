#!/usr/bin/env node

/**
 * Check Empty Recipes Script
 * 
 * This script checks which recipes have missing or empty ingredients.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

function makeRequest(options, data = null) {
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
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function authenticate() {
  const options = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const result = await makeRequest(options, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  return {
    accessToken: result.access_token,
    userId: result.user.id
  };
}

async function checkEmptyRecipes() {
  console.log('🔍 Checking recipes for missing ingredients...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Get all recipe templates
  console.log('📋 Fetching all recipe templates...');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name,is_active,suggested_price&order=name',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  console.log(`✅ Found ${templates.length} recipe templates\n`);
  
  // Check ingredients for each template
  const emptyRecipes = [];
  const recipesWithIngredients = [];
  
  for (const template of templates) {
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_template_ingredients?recipe_template_id=eq.${template.id}&select=id,ingredient_name,quantity,unit,cost_per_unit`,
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    
    if (ingredients.length === 0) {
      emptyRecipes.push({
        id: template.id,
        name: template.name,
        category: template.category_name,
        price: template.suggested_price,
        isActive: template.is_active
      });
    } else {
      recipesWithIngredients.push({
        id: template.id,
        name: template.name,
        category: template.category_name,
        price: template.suggested_price,
        isActive: template.is_active,
        ingredientCount: ingredients.length,
        ingredients: ingredients.map(ing => ({
          name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost: ing.cost_per_unit
        }))
      });
    }
  }
  
  // Display results
  console.log('📊 ANALYSIS RESULTS:\n');
  
  console.log(`❌ RECIPES WITH NO INGREDIENTS (${emptyRecipes.length}):`);
  if (emptyRecipes.length > 0) {
    emptyRecipes.forEach(recipe => {
      console.log(`   • ${recipe.name} (${recipe.category}) - ₱${recipe.price} - ${recipe.isActive ? 'Active' : 'Inactive'}`);
    });
  } else {
    console.log('   None found!');
  }
  
  console.log(`\n✅ RECIPES WITH INGREDIENTS (${recipesWithIngredients.length}):`);
  recipesWithIngredients.forEach(recipe => {
    console.log(`   • ${recipe.name} (${recipe.category}) - ${recipe.ingredientCount} ingredients - ₱${recipe.price}`);
  });
  
  // Show detailed ingredients for a few recipes
  console.log('\n🔍 SAMPLE RECIPE DETAILS:');
  const sampleRecipes = recipesWithIngredients.slice(0, 3);
  for (const recipe of sampleRecipes) {
    console.log(`\n📋 ${recipe.name}:`);
    recipe.ingredients.forEach(ing => {
      console.log(`   - ${ing.name}: ${ing.quantity} ${ing.unit} @ ₱${ing.cost} each`);
    });
  }
  
  // Check if Mango is in the empty list
  const mangoRecipe = emptyRecipes.find(r => r.name.toLowerCase().includes('mango'));
  if (mangoRecipe) {
    console.log(`\n🥭 MANGO RECIPE STATUS: EMPTY (needs ingredients)`);
  } else {
    const mangoWithIngredients = recipesWithIngredients.find(r => r.name.toLowerCase().includes('mango'));
    if (mangoWithIngredients) {
      console.log(`\n🥭 MANGO RECIPE STATUS: HAS INGREDIENTS`);
      console.log(`   Ingredients: ${mangoWithIngredients.ingredientCount}`);
      mangoWithIngredients.ingredients.forEach(ing => {
        console.log(`   - ${ing.name}: ${ing.quantity} ${ing.unit} @ ₱${ing.cost}`);
      });
    } else {
      console.log(`\n🥭 MANGO RECIPE STATUS: NOT FOUND`);
    }
  }
  
  // Summary and recommendations
  console.log('\n📋 SUMMARY:');
  console.log(`   Total recipes: ${templates.length}`);
  console.log(`   Empty recipes: ${emptyRecipes.length}`);
  console.log(`   Complete recipes: ${recipesWithIngredients.length}`);
  
  if (emptyRecipes.length > 0) {
    console.log('\n💡 RECOMMENDATION:');
    console.log('   Run the finalUpload.cjs script to add ingredients to all empty recipes.');
    console.log('   This will fix your Mango recipe and any other empty recipes.');
  } else {
    console.log('\n🎉 All recipes have ingredients! No action needed.');
  }
  
  return {
    emptyRecipes,
    recipesWithIngredients,
    totalRecipes: templates.length
  };
}

checkEmptyRecipes().catch(console.error);
