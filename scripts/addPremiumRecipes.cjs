#!/usr/bin/env node

/**
 * Add Premium Recipes from 61 Products List
 * 
 * This script adds the Premium category recipes from the complete 61 products list.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// Premium recipes from the 61 products list
const premiumRecipes = [
  // Premium Croffles
  { recipe_name: "Biscoff Croffle", recipe_category: "Premium", ingredient_name: "Chopstick", quantity: 1, unit: "pair", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Biscoff Croffle", recipe_category: "Premium", ingredient_name: "Wax Paper", quantity: 1, unit: "piece", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Biscoff Croffle", recipe_category: "Premium", ingredient_name: "Regular Croissant", quantity: 1, unit: "piece", cost_per_unit: 15, suggested_price: 125 },
  { recipe_name: "Biscoff Croffle", recipe_category: "Premium", ingredient_name: "Whipped Cream", quantity: 1, unit: "serving", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Biscoff Croffle", recipe_category: "Premium", ingredient_name: "Biscoff Crushed", quantity: 1, unit: "portion", cost_per_unit: 3.5, suggested_price: 125 },
  { recipe_name: "Biscoff Croffle", recipe_category: "Premium", ingredient_name: "Biscoff", quantity: 1, unit: "piece", cost_per_unit: 3.5, suggested_price: 125 },
  { recipe_name: "Choco Overload Croffle", recipe_category: "Premium", ingredient_name: "Regular Croissant", quantity: 1, unit: "piece", cost_per_unit: 15, suggested_price: 125 },
  { recipe_name: "Choco Overload Croffle", recipe_category: "Premium", ingredient_name: "Whipped Cream", quantity: 1, unit: "serving", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Choco Overload Croffle", recipe_category: "Premium", ingredient_name: "Chocolate Sauce", quantity: 1, unit: "portion", cost_per_unit: 1.75, suggested_price: 125 },
  { recipe_name: "Choco Overload Croffle", recipe_category: "Premium", ingredient_name: "Choco Flakes", quantity: 1, unit: "portion", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Choco Overload Croffle", recipe_category: "Premium", ingredient_name: "Chopstick", quantity: 1, unit: "pair", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Choco Overload Croffle", recipe_category: "Premium", ingredient_name: "Wax Paper", quantity: 1, unit: "piece", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Cookies Cream Croffle", recipe_category: "Premium", ingredient_name: "Regular Croissant", quantity: 1, unit: "piece", cost_per_unit: 15, suggested_price: 125 },
  { recipe_name: "Cookies Cream Croffle", recipe_category: "Premium", ingredient_name: "Whipped Cream", quantity: 1, unit: "serving", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Cookies Cream Croffle", recipe_category: "Premium", ingredient_name: "Crushed Oreo", quantity: 1, unit: "portion", cost_per_unit: 2, suggested_price: 125 },
  { recipe_name: "Cookies Cream Croffle", recipe_category: "Premium", ingredient_name: "Oreo Cookie", quantity: 1, unit: "piece", cost_per_unit: 2, suggested_price: 125 },
  { recipe_name: "Cookies Cream Croffle", recipe_category: "Premium", ingredient_name: "Chopstick", quantity: 1, unit: "pair", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Cookies Cream Croffle", recipe_category: "Premium", ingredient_name: "Wax Paper", quantity: 1, unit: "piece", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Dark Chocolate Croffle", recipe_category: "Premium", ingredient_name: "Regular Croissant", quantity: 1, unit: "piece", cost_per_unit: 15, suggested_price: 125 },
  { recipe_name: "Dark Chocolate Croffle", recipe_category: "Premium", ingredient_name: "Whipped Cream", quantity: 1, unit: "serving", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Dark Chocolate Croffle", recipe_category: "Premium", ingredient_name: "Dark Chocolate Sauce", quantity: 1, unit: "portion", cost_per_unit: 1.75, suggested_price: 125 },
  { recipe_name: "Dark Chocolate Croffle", recipe_category: "Premium", ingredient_name: "Chocolate Crumble", quantity: 1, unit: "portion", cost_per_unit: 1.75, suggested_price: 125 },
  { recipe_name: "Dark Chocolate Croffle", recipe_category: "Premium", ingredient_name: "Chopstick", quantity: 1, unit: "pair", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Dark Chocolate Croffle", recipe_category: "Premium", ingredient_name: "Wax Paper", quantity: 1, unit: "piece", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "KitKat Croffle", recipe_category: "Premium", ingredient_name: "Regular Croissant", quantity: 1, unit: "piece", cost_per_unit: 15, suggested_price: 125 },
  { recipe_name: "KitKat Croffle", recipe_category: "Premium", ingredient_name: "Whipped Cream", quantity: 1, unit: "serving", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "KitKat Croffle", recipe_category: "Premium", ingredient_name: "Chocolate Sauce", quantity: 1, unit: "portion", cost_per_unit: 1.75, suggested_price: 125 },
  { recipe_name: "KitKat Croffle", recipe_category: "Premium", ingredient_name: "Kitkat", quantity: 0.5, unit: "piece", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "KitKat Croffle", recipe_category: "Premium", ingredient_name: "Chopstick", quantity: 1, unit: "pair", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "KitKat Croffle", recipe_category: "Premium", ingredient_name: "Wax Paper", quantity: 1, unit: "piece", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Matcha Croffle", recipe_category: "Premium", ingredient_name: "Regular Croissant", quantity: 1, unit: "piece", cost_per_unit: 15, suggested_price: 125 },
  { recipe_name: "Matcha Croffle", recipe_category: "Premium", ingredient_name: "Whipped Cream", quantity: 1, unit: "serving", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Matcha Croffle", recipe_category: "Premium", ingredient_name: "Matcha Crumble", quantity: 1, unit: "portion", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Matcha Croffle", recipe_category: "Premium", ingredient_name: "Chopstick", quantity: 1, unit: "pair", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Matcha Croffle", recipe_category: "Premium", ingredient_name: "Wax Paper", quantity: 1, unit: "piece", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Nutella Croffle", recipe_category: "Premium", ingredient_name: "Regular Croissant", quantity: 1, unit: "piece", cost_per_unit: 15, suggested_price: 125 },
  { recipe_name: "Nutella Croffle", recipe_category: "Premium", ingredient_name: "Whipped Cream", quantity: 1, unit: "serving", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Nutella Croffle", recipe_category: "Premium", ingredient_name: "Nutella Sauce", quantity: 1, unit: "portion", cost_per_unit: 1, suggested_price: 125 },
  { recipe_name: "Nutella Croffle", recipe_category: "Premium", ingredient_name: "Chopstick", quantity: 1, unit: "pair", cost_per_unit: 0.25, suggested_price: 125 },
  { recipe_name: "Nutella Croffle", recipe_category: "Premium", ingredient_name: "Wax Paper", quantity: 1, unit: "piece", cost_per_unit: 0.25, suggested_price: 125 },
  
  // Add-on
  { recipe_name: "Dark Chocolate Sauce", recipe_category: "Add-on", ingredient_name: "Dark Chocolate Sauce", quantity: 1, unit: "portion", cost_per_unit: 1.75, suggested_price: 8 }
];

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

async function main() {
  try {
    console.log('🚀 ADDING PREMIUM RECIPES FROM 61 PRODUCTS');
    console.log('='.repeat(60));
    
    await authenticateAdmin();
    
    // Get existing recipe templates
    const existingTemplatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=name',
      method: 'GET',
      headers
    };
    
    const existingTemplates = await makeRequest(existingTemplatesOptions);
    const existingNames = new Set(existingTemplates.map(t => t.name));
    console.log(`📋 Found ${existingNames.size} existing recipe templates`);
    
    // Group data by recipe
    const recipes = premiumRecipes.reduce((acc, item) => {
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
    console.log(`📋 Found ${recipeNames.length} premium recipe templates to import`);
    
    // Calculate unique ingredients
    const allIngredients = premiumRecipes.map(item => item.ingredient_name);
    const uniqueIngredients = [...new Set(allIngredients)];
    console.log(`🥘 Found ${uniqueIngredients.length} unique ingredients in premium recipes`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Create each recipe template (skip if already exists)
    for (const [recipeName, recipe] of Object.entries(recipes)) {
      try {
        if (existingNames.has(recipeName)) {
          console.log(`\n⏭️  Skipping ${recipeName} (already exists)`);
          skippedCount++;
          continue;
        }
        
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

        // Create ingredients in small batches
        const batchSize = 3;
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
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`   ✅ Added ${recipe.ingredients.length} ingredients`);
        successCount++;
        
        // Small delay between recipes
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`   ❌ Error creating ${recipeName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 IMPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${successCount} templates`);
    console.log(`⏭️  Skipped (already exist): ${skippedCount} templates`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total unique ingredients in batch: ${uniqueIngredients.length}`);
    
    // Check final count
    const finalTemplatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=id',
      method: 'GET',
      headers
    };
    
    const finalTemplates = await makeRequest(finalTemplatesOptions);
    console.log(`🎯 Total recipe templates now: ${finalTemplates.length}`);
    
    if (finalTemplates.length >= 61) {
      console.log('\n🎉 SUCCESS: We now have 61+ recipe templates!');
      console.log('\n🔄 NEXT STEPS:');
      console.log('1. Run the inventory deployment to create inventory items');
      console.log('2. Verify that all stores have the expected inventory items');
    } else {
      console.log(`\n⚠️  Still need ${61 - finalTemplates.length} more templates to reach 61`);
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();
