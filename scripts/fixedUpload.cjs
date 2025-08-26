#!/usr/bin/env node

/**
 * Fixed Recipe Upload Script
 * 
 * Usage:
 *   node scripts/fixedUpload.cjs
 * 
 * This script uses the correct database schema.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Recipe data
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
  
  const result = await makeRequest(options, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  console.log('✅ Authentication successful');
  return {
    accessToken: result.access_token,
    userId: result.user.id
  };
}

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
        // Update existing template
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_templates?id=eq.${templateId}`,
          method: 'PATCH',
          headers
        };
        
        await makeRequest(updateOptions, {
          category_name: recipe.category,
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
        // Create new template using correct schema
        const createOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/recipe_templates',
          method: 'POST',
          headers
        };
        
        const templateData = {
          name: recipe.product,
          description: `${recipe.product} recipe`,
          category_name: recipe.category,
          instructions: `Prepare ${recipe.product}`,
          yield_quantity: 1,
          serving_size: 1,
          suggested_price: recipe.price,
          version: 1,
          is_active: true,
          created_by: auth.userId,
          recipe_type: 'single',
          has_choice_groups: false,
          preparation_time: 0
        };
        
        const newTemplate = await makeRequest(createOptions, templateData);
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
        let itemId = null;
        
        if (items.length === 0) {
          // Create commissary item using correct schema
          const createItemOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: '/rest/v1/commissary_inventory',
            method: 'POST',
            headers
          };
          
          const itemData = {
            name: ingredient.name,
            category: 'raw_materials',
            item_type: 'raw_material',
            current_stock: 100,
            minimum_threshold: 10,
            unit: ingredient.unit,
            unit_cost: ingredient.cost,
            is_active: true,
            order_unit: ingredient.unit,
            order_quantity: 1,
            serving_quantity: 1,
            conversion_ratio: 1,
            normalized_unit: ingredient.unit,
            average_cost: ingredient.cost
          };
          
          const newItem = await makeRequest(createItemOptions, itemData);
          itemId = newItem[0].id;
          commissaryCreated++;
        } else {
          itemId = items[0].id;
        }
        
        // Add ingredient using correct schema
        ingredientInserts.push({
          recipe_template_id: templateId,
          commissary_item_id: itemId,
          commissary_item_name: ingredient.name,
          ingredient_name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost,
          ingredient_type: 'raw_material',
          location_type: 'all',
          is_optional: false,
          display_order: 0,
          recipe_to_store_conversion_factor: 1,
          uses_store_inventory: false,
          choice_group_type: 'required',
          selection_min: 0,
          selection_max: 1,
          is_default_selection: false,
          choice_order: 0
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
      console.log(`❌ ${error.message}`);
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

uploadRecipes().catch(console.error);
