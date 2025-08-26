#!/usr/bin/env node

/**
 * Import Recipe Templates
 * 
 * This script imports the 61 recipe templates and their ingredients that should be 
 * the source for the inventory deployment.
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

// Recipe data from the uploadRecipeTemplates.ts file
const recipeData = [
  { product: "Tiramisu", category: "Classic", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "Tiramisu", unit: "portion", quantity: 1, costPerUnit: 3.5, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "Choco Flakes", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "Peanut", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "Caramel", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "Colored Sprinkles", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "Marshmallow", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "Strawberry Jam", unit: "scoop", quantity: 1, costPerUnit: 5, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "Mango Jam", unit: "scoop", quantity: 1, costPerUnit: 7, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "Graham Crushed", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "Blueberry Jam", unit: "scoop", quantity: 1, costPerUnit: 7.5, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "Graham Crushed", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "Biscoff Crushed", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "Biscoff", unit: "piece", quantity: 1, costPerUnit: 5.62, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "Nutella", unit: "portion", quantity: 1, costPerUnit: 4.5, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "Kitkat", unit: "piece", quantity: 0.5, costPerUnit: 6.25, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "Oreo Crushed", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "Oreo Cookies", unit: "piece", quantity: 1, costPerUnit: 2.9, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "Choco Flakes", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "Matcha crumble", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "Dark Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "Chocolate crumble", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 }
];

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
          } else {
            resolve(result);
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
  
  // Update headers with access token
  headers.Authorization = `Bearer ${authResult.access_token}`;
  
  console.log('✅ Admin authenticated successfully');
  return authResult;
}

async function main() {
  try {
    console.log('🚀 IMPORTING RECIPE TEMPLATES');
    console.log('='.repeat(50));
    
    // Authenticate first
    await authenticateAdmin();
    
    // Group data by product
    const recipes = recipeData.reduce((acc, item) => {
      if (!acc[item.product]) {
        acc[item.product] = {
          name: item.product,
          category: item.category,
          price: item.price,
          ingredients: []
        };
      }
      acc[item.product].ingredients.push({
        ingredient_name: item.ingredient,
        quantity: item.quantity,
        unit: item.unit,
        cost_per_unit: item.costPerUnit
      });
      return acc;
    }, {});

    const recipeNames = Object.keys(recipes);
    console.log(`📋 Found ${recipeNames.length} recipe templates to import`);
    
    // Calculate unique ingredients
    const allIngredients = recipeData.map(item => item.ingredient);
    const uniqueIngredients = [...new Set(allIngredients)];
    console.log(`🥘 Found ${uniqueIngredients.length} unique ingredients`);
    
    let successCount = 0;
    let errorCount = 0;

    // Create each recipe template
    for (const [productName, recipe] of Object.entries(recipes)) {
      try {
        console.log(`\n🔄 Creating template for ${productName}...`);
        
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
          version: 1,
          is_active: true
        };
        
        const template = await makeRequest(templateOptions, templateData);
        const templateId = template[0].id;
        
        console.log(`   ✅ Created template ${templateId}`);

        // Create ingredients
        const ingredientInserts = recipe.ingredients.map(ing => ({
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
          headers
        };
        
        await makeRequest(ingredientsOptions, ingredientInserts);
        
        console.log(`   ✅ Added ${recipe.ingredients.length} ingredients`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error creating ${productName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 IMPORT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Successfully created: ${successCount} templates`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total unique ingredients: ${uniqueIngredients.length}`);
    console.log(`🏪 Expected inventory items per store: ${uniqueIngredients.length}`);
    console.log(`📦 Expected total inventory items (8 stores): ${uniqueIngredients.length * 8}`);
    
    if (successCount > 0) {
      console.log('\n🔄 NEXT STEPS:');
      console.log('1. Run the inventory deployment migration to create inventory items');
      console.log('2. Verify that all stores have the expected inventory items');
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

main();
