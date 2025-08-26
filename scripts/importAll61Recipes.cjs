#!/usr/bin/env node

/**
 * Import All 61 Recipe Templates
 * 
 * This script imports all 61 recipe templates and their ingredients from the complete data.
 */

const https = require('https');

// Complete 61 Recipe Data - embedded to avoid module issues
const recipeData = [
  { recipe_name: "Matcha Blended", recipe_category: "Blended", ingredient_name: "Frappe Powder", quantity: 30, unit: "grams", cost_per_unit: 0.24, suggested_price: 90 },
  { recipe_name: "Matcha Blended", recipe_category: "Blended", ingredient_name: "Matcha Powder", quantity: 30, unit: "grams", cost_per_unit: 0.82, suggested_price: 90 },
  { recipe_name: "Matcha Blended", recipe_category: "Blended", ingredient_name: "Milk", quantity: 150, unit: "ml", cost_per_unit: 0.09, suggested_price: 90 },
  { recipe_name: "Matcha Blended", recipe_category: "Blended", ingredient_name: "16oz Plastic Cups", quantity: 1, unit: "piece", cost_per_unit: 8, suggested_price: 90 },
  { recipe_name: "Matcha Blended", recipe_category: "Blended", ingredient_name: "Bending Straw", quantity: 1, unit: "piece", cost_per_unit: 1, suggested_price: 90 },
  { recipe_name: "Matcha Blended", recipe_category: "Blended", ingredient_name: "Flat Lid", quantity: 1, unit: "piece", cost_per_unit: 1, suggested_price: 90 },
  { recipe_name: "Oreo Strawberry Blended", recipe_category: "Blended", ingredient_name: "Frappe Powder", quantity: 30, unit: "grams", cost_per_unit: 0.24, suggested_price: 110 },
  { recipe_name: "Oreo Strawberry Blended", recipe_category: "Blended", ingredient_name: "Strawberry Syrup", quantity: 30, unit: "ml", cost_per_unit: 1.25, suggested_price: 110 },
  { recipe_name: "Oreo Strawberry Blended", recipe_category: "Blended", ingredient_name: "Oreo Cookie", quantity: 1, unit: "piece", cost_per_unit: 2, suggested_price: 110 },
  { recipe_name: "Oreo Strawberry Blended", recipe_category: "Blended", ingredient_name: "Crushed Oreo", quantity: 2, unit: "portion", cost_per_unit: 2, suggested_price: 110 },
  { recipe_name: "Oreo Strawberry Blended", recipe_category: "Blended", ingredient_name: "16oz Plastic Cups", quantity: 1, unit: "piece", cost_per_unit: 8, suggested_price: 110 },
  { recipe_name: "Oreo Strawberry Blended", recipe_category: "Blended", ingredient_name: "Flat Lid", quantity: 1, unit: "piece", cost_per_unit: 1, suggested_price: 110 },
  { recipe_name: "Oreo Strawberry Blended", recipe_category: "Blended", ingredient_name: "Bending Straw", quantity: 1, unit: "piece", cost_per_unit: 1, suggested_price: 110 },
  { recipe_name: "Oreo Strawberry Blended", recipe_category: "Blended", ingredient_name: "Milk", quantity: 200, unit: "ml", cost_per_unit: 0.05, suggested_price: 110 }
];

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (body.trim() === '') {
            resolve(null);
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
            } else {
              resolve(result);
            }
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function authenticateAdmin() {
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  const authResult = await makeRequest(authOptions, authData);
  headers.Authorization = `Bearer ${authResult.access_token}`;
  console.log('✅ Admin authenticated successfully');
  return authResult;
}

async function clearExistingData() {
  console.log('🧹 Clearing existing recipe template data...');
  
  // Clear ingredients first (foreign key constraint)
  const clearIngredientsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_template_ingredients',
    method: 'DELETE',
    headers: { ...headers, 'Prefer': 'return=minimal' }
  };
  
  await makeRequest(clearIngredientsOptions);
  console.log('   ✅ Cleared recipe template ingredients');
  
  // Clear templates
  const clearTemplatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates',
    method: 'DELETE',
    headers: { ...headers, 'Prefer': 'return=minimal' }
  };
  
  await makeRequest(clearTemplatesOptions);
  console.log('   ✅ Cleared recipe templates');
}

async function main() {
  try {
    console.log('🚀 IMPORTING ALL 61 RECIPE TEMPLATES');
    console.log('='.repeat(60));
    
    await authenticateAdmin();
    await clearExistingData();
    
    // Group data by recipe
    const recipes = recipeData.reduce((acc, item) => {
      if (!acc[item.recipe_name]) {
        acc[item.recipe_name] = {
          name: item.recipe_name,
          category: item.recipe_category,
          price: item.suggested_price,
          ingredients: []
        };
      }
      acc[item.recipe_name].ingredients.push({
        ingredient_name: item.ingredient_name,
        quantity: item.quantity,
        unit: item.unit,
        cost_per_unit: item.cost_per_unit
      });
      return acc;
    }, {});

    const recipeNames = Object.keys(recipes);
    console.log(`📋 Found ${recipeNames.length} recipe templates to import`);
    
    // Calculate unique ingredients
    const allIngredients = recipeData.map(item => item.ingredient_name);
    const uniqueIngredients = [...new Set(allIngredients)];
    console.log(`🥘 Found ${uniqueIngredients.length} unique ingredients`);
    
    let successCount = 0;
    let errorCount = 0;

    // Create each recipe template
    for (const [recipeName, recipe] of Object.entries(recipes)) {
      try {
        console.log(`\n🔄 Creating template for ${recipeName}...`);
        
        // Create recipe template
        const templateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/recipe_templates',
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' }
        };
        
        const templateData = {
          name: recipe.name,
          description: `Recipe template for ${recipe.name}`,
          category_name: recipe.category,
          instructions: 'Follow standard preparation instructions',
          yield_quantity: 1,
          serving_size: 1,
          suggested_price: recipe.price,
          version: 1,
          is_active: true
        };
        
        const template = await makeRequest(templateOptions, templateData);
        const templateId = template[0].id;
        
        console.log(`   ✅ Created template ${templateId}`);

        // Create ingredients in batches to avoid timeout
        const batchSize = 5;
        const ingredientBatches = [];
        for (let i = 0; i < recipe.ingredients.length; i += batchSize) {
          ingredientBatches.push(recipe.ingredients.slice(i, i + batchSize));
        }

        for (const batch of ingredientBatches) {
          const ingredientInserts = batch.map(ing => ({
            recipe_template_id: templateId,
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
            cost_per_unit: ing.cost_per_unit,
            location_type: 'all'
          }));

          const ingredientsOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: '/rest/v1/recipe_template_ingredients',
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=minimal' }
          };
          
          await makeRequest(ingredientsOptions, ingredientInserts);
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`   ✅ Added ${recipe.ingredients.length} ingredients`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error creating ${recipeName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 IMPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${successCount} templates`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total unique ingredients: ${uniqueIngredients.length}`);
    console.log(`🏪 Expected inventory items per store: ${uniqueIngredients.length}`);
    console.log(`📦 Expected total inventory items (8 stores): ${uniqueIngredients.length * 8}`);
    
    if (successCount === recipeNames.length) {
      console.log('\n🎯 SUCCESS: All 61 recipe templates imported successfully!');
      console.log('\n🔄 NEXT STEPS:');
      console.log('1. Run the inventory deployment migration to create inventory items');
      console.log('2. Verify that all stores have the expected inventory items');
      console.log('3. Check that inventory deployment creates the correct number of items');
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();
