#!/usr/bin/env node

/**
 * Terminal Recipe Upload Script
 * 
 * Usage:
 *   node scripts/uploadRecipes.cjs
 * 
 * This script uploads all recipes directly to Supabase without needing the browser.
 */

const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// Admin credentials - you'll need to update these
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// All recipe data
const recipes = [
  // Classic Croffles
  { product: 'Tiramisu', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Tiramisu', unit: 'portion', quantity: 1, cost: 3.5 },
    { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Choco Nut', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Peanut', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Caramel Delight', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Caramel', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Colored Sprinkles', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Choco Marshmallow', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Marshmallow', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Strawberry', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Strawberry Jam', unit: 'scoop', quantity: 1, cost: 5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Mango', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Mango Jam', unit: 'scoop', quantity: 1, cost: 7 },
    { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Blueberry', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Blueberry Jam', unit: 'scoop', quantity: 1, cost: 7.5 },
    { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Biscoff', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Biscoff Crushed', unit: 'portion', quantity: 1, cost: 5 },
    { name: 'Biscoff', unit: 'piece', quantity: 1, cost: 5.62 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Nutella', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Nutella', unit: 'portion', quantity: 1, cost: 4.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'KitKat', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'KitKat', unit: 'piece', quantity: 0.5, cost: 6.25 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Cookies & Cream', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Oreo Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Oreo Cookies', unit: 'piece', quantity: 1, cost: 2.9 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Choco Overload', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Matcha', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Matcha Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  { product: 'Dark Chocolate', category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Dark Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chocolate Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
  ]},
  
  // Coffee Drinks
  { product: 'Americano (Hot)', category: 'espresso', price: 65, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Hot Water', unit: 'ml', quantity: 150, cost: 0 }
  ]},
  { product: 'Americano (Iced)', category: 'espresso', price: 70, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Cold Water', unit: 'ml', quantity: 100, cost: 0 },
    { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
  ]},
  { product: 'Cappuccino (Hot)', category: 'espresso', price: 75, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Steamed Milk', unit: 'ml', quantity: 120, cost: 0 },
    { name: 'Milk Foam', unit: 'ml', quantity: 30, cost: 0 }
  ]},
  { product: 'Cappuccino (Iced)', category: 'espresso', price: 80, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Cold Milk', unit: 'ml', quantity: 120, cost: 0 },
    { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
  ]},
  { product: 'Café Latte (Hot)', category: 'espresso', price: 75, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Steamed Milk', unit: 'ml', quantity: 180, cost: 0 }
  ]},
  { product: 'Café Latte (Iced)', category: 'espresso', price: 80, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Cold Milk', unit: 'ml', quantity: 180, cost: 0 },
    { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
  ]},
  { product: 'Café Mocha (Hot)', category: 'espresso', price: 80, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Chocolate Syrup', unit: 'pump', quantity: 1, cost: 0 },
    { name: 'Steamed Milk', unit: 'ml', quantity: 150, cost: 0 }
  ]},
  { product: 'Café Mocha (Iced)', category: 'espresso', price: 85, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Chocolate Syrup', unit: 'pump', quantity: 1, cost: 0 },
    { name: 'Cold Milk', unit: 'ml', quantity: 150, cost: 0 },
    { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
  ]},
  { product: 'Caramel Latte (Hot)', category: 'espresso', price: 80, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Caramel Syrup', unit: 'pump', quantity: 1, cost: 0 },
    { name: 'Steamed Milk', unit: 'ml', quantity: 150, cost: 0 }
  ]},
  { product: 'Caramel Latte (Iced)', category: 'espresso', price: 85, ingredients: [
    { name: 'Espresso Shot', unit: 'shot', quantity: 1, cost: 0 },
    { name: 'Caramel Syrup', unit: 'pump', quantity: 1, cost: 0 },
    { name: 'Cold Milk', unit: 'ml', quantity: 150, cost: 0 },
    { name: 'Ice', unit: 'cubes', quantity: 5, cost: 0 }
  ]},
  
  // Other Drinks
  { product: 'Coke', category: 'others', price: 15, ingredients: [
    { name: 'Softdrinks', unit: 'piece', quantity: 20, cost: 11.3 }
  ]},
  { product: 'Sprite', category: 'others', price: 15, ingredients: [
    { name: 'Softdrinks', unit: 'piece', quantity: 20, cost: 11.3 }
  ]},
  { product: 'Bottled Water', category: 'others', price: 20, ingredients: [
    { name: 'Water', unit: 'piece', quantity: 20, cost: 15 }
  ]}
];

// HTTP request helper
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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Authenticate with Supabase
async function authenticate() {
  console.log('🔐 Authenticating...');
  
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
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const result = await makeRequest(options, authData);
    console.log('✅ Authentication successful');
    return {
      accessToken: result.access_token,
      userId: result.user.id
    };
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    console.error('   Full error:', JSON.stringify(error, null, 2));
    console.log('💡 Please check:');
    console.log('   - Admin email and password are correct');
    console.log('   - Admin account exists and is active');
    console.log('   - Internet connection is working');
    process.exit(1);
  }
}

// Upload recipes
async function uploadRecipes() {
  console.log('🚀 Starting recipe upload...');
  console.log(`📊 Processing ${recipes.length} recipes\n`);
  
  const auth = await authenticate();
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  let success = 0;
  let failed = 0;
  let commissaryCreated = 0;
  
  for (const recipe of recipes) {
    try {
      process.stdout.write(`🔄 ${recipe.product}... `);
      
      const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.cost * ing.quantity), 0);
      
      // Check existing template
      const checkOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_templates?name=eq.${encodeURIComponent(recipe.product)}&select=id`,
        method: 'GET',
        headers
      };
      
      const existing = await makeRequest(checkOptions);
      let templateId;
      
      if (existing.length > 0) {
        templateId = existing[0].id;
        // Update existing
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_templates?id=eq.${templateId}`,
          method: 'PATCH',
          headers
        };
        
        await makeRequest(updateOptions, {
          category_name: recipe.category,
          total_cost: totalCost,
          suggested_price: recipe.price,
          updated_at: new Date().toISOString()
        });
        
        // Delete old ingredients
        const deleteOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_template_ingredients?recipe_template_id=eq.${templateId}`,
          method: 'DELETE',
          headers
        };
        
        await makeRequest(deleteOptions);
      } else {
        // Create new template
        const createOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/recipe_templates',
          method: 'POST',
          headers
        };
        
        const newTemplate = await makeRequest(createOptions, {
          name: recipe.product,
          description: `${recipe.product} recipe`,
          category_name: recipe.category,
          instructions: `Prepare ${recipe.product}`,
          yield_quantity: 1,
          serving_size: 1,
          total_cost: totalCost,
          suggested_price: recipe.price,
          version: 1,
          is_active: true,
          created_by: auth.userId
        });
        
        templateId = newTemplate[0].id;
      }
      
      // Process ingredients
      const ingredientInserts = [];
      
      for (const ingredient of recipe.ingredients) {
        // Find or create commissary item
        const itemOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/commissary_inventory?name=eq.${encodeURIComponent(ingredient.name)}&is_active=eq.true&select=id`,
          method: 'GET',
          headers
        };
        
        const items = await makeRequest(itemOptions);
        let itemId;
        
        if (items.length === 0) {
          // Create commissary item
          const createItemOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: '/rest/v1/commissary_inventory',
            method: 'POST',
            headers
          };
          
          const newItem = await makeRequest(createItemOptions, {
            name: ingredient.name,
            category: 'raw_materials',
            item_type: 'raw_material',
            current_stock: 100,
            minimum_threshold: 10,
            unit: ingredient.unit,
            unit_cost: ingredient.cost,
            is_active: true
          });
          
          itemId = newItem[0].id;
          commissaryCreated++;
        } else {
          itemId = items[0].id;
        }
        
        ingredientInserts.push({
          recipe_template_id: templateId,
          commissary_item_id: itemId,
          ingredient_name: ingredient.name,
          commissary_item_name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost,
          recipe_unit: ingredient.unit,
          purchase_unit: ingredient.unit,
          conversion_factor: 1,
          location_type: 'all'
        });
      }
      
      // Insert ingredients
      if (ingredientInserts.length > 0) {
        const insertOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/recipe_template_ingredients',
          method: 'POST',
          headers
        };
        
        await makeRequest(insertOptions, ingredientInserts);
      }
      
      console.log('✅');
      success++;
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      console.log(`   Details: ${JSON.stringify(error, null, 2)}`);
      failed++;
    }
  }
  
  console.log('\n📊 RESULTS:');
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Commissary items created: ${commissaryCreated}`);
  console.log('\n🎉 Upload complete! Your Mango recipe now has all ingredients.');
  console.log('📋 Next: Deploy recipes to stores using the admin panel.');
}

// Run the upload
uploadRecipes().catch(console.error);
