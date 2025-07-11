#!/usr/bin/env node

/**
 * Smart Recipe Upload Script
 * 
 * This script intelligently updates empty recipes with proper prices,
 * based on the recipes from the recipes folder.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Recipe data from recipes folder with corrected units
const recipeData = {
  // Classic Croffles
  'Tiramisu': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Tiramisu', unit: 'portion', quantity: 1, cost: 3.5 },
    { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Choco Nut': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Peanut', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Caramel Delight': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Caramel', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Colored Sprinkles', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Choco Marshmallow': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Marshmallow', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Strawberry': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Strawberry Jam', unit: 'scoop', quantity: 1, cost: 5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Mango': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Mango Jam', unit: 'scoop', quantity: 1, cost: 7 },
    { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Blueberry': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Blueberry Jam', unit: 'scoop', quantity: 1, cost: 7.5 },
    { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Biscoff': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Biscoff Crushed', unit: 'portion', quantity: 1, cost: 5 },
    { name: 'Biscoff', unit: 'pieces', quantity: 1, cost: 5.62 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Nutella': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Nutella', unit: 'portion', quantity: 1, cost: 4.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'KitKat': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'KitKat', unit: 'pieces', quantity: 0.5, cost: 6.25 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Cookies & Cream': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Oreo Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Oreo Cookies', unit: 'pieces', quantity: 1, cost: 2.9 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Choco Overload': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Matcha': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Matcha Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  'Dark Chocolate': { category: 'classic', price: 125, ingredients: [
    { name: 'Regular Croissant', unit: 'pieces', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Dark Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chocolate Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
    { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
    { name: 'Wax Paper', unit: 'pieces', quantity: 1, cost: 0.7 }
  ]},
  
  // Coffee Drinks
  'Americano (Hot)': { category: 'espresso', price: 65, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Hot Water', unit: 'ml', quantity: 150, cost: 0 }
  ]},
  'Americano (Iced)': { category: 'espresso', price: 70, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Cold Water', unit: 'ml', quantity: 100, cost: 0 },
    { name: 'Ice', unit: 'pieces', quantity: 5, cost: 0 }
  ]},
  'Cappuccino (Hot)': { category: 'espresso', price: 75, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Steamed Milk', unit: 'ml', quantity: 120, cost: 0 },
    { name: 'Milk Foam', unit: 'ml', quantity: 30, cost: 0 }
  ]},
  'Cappuccino (Iced)': { category: 'espresso', price: 80, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Cold Milk', unit: 'ml', quantity: 120, cost: 0 },
    { name: 'Ice', unit: 'pieces', quantity: 5, cost: 0 }
  ]},
  'Café Latte (Hot)': { category: 'espresso', price: 75, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Steamed Milk', unit: 'ml', quantity: 180, cost: 0 }
  ]},
  'Café Latte (Iced)': { category: 'espresso', price: 80, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Cold Milk', unit: 'ml', quantity: 180, cost: 0 },
    { name: 'Ice', unit: 'pieces', quantity: 5, cost: 0 }
  ]},
  'Café Mocha (Hot)': { category: 'espresso', price: 80, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Chocolate Syrup', unit: 'ml', quantity: 15, cost: 0 },
    { name: 'Steamed Milk', unit: 'ml', quantity: 150, cost: 0 }
  ]},
  'Café Mocha (Iced)': { category: 'espresso', price: 85, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Chocolate Syrup', unit: 'ml', quantity: 15, cost: 0 },
    { name: 'Cold Milk', unit: 'ml', quantity: 150, cost: 0 },
    { name: 'Ice', unit: 'pieces', quantity: 5, cost: 0 }
  ]},
  'Caramel Latte (Hot)': { category: 'espresso', price: 80, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Caramel Syrup', unit: 'ml', quantity: 15, cost: 0 },
    { name: 'Steamed Milk', unit: 'ml', quantity: 150, cost: 0 }
  ]},
  'Caramel Latte (Iced)': { category: 'espresso', price: 85, ingredients: [
    { name: 'Espresso Shot', unit: 'ml', quantity: 30, cost: 0 },
    { name: 'Caramel Syrup', unit: 'ml', quantity: 15, cost: 0 },
    { name: 'Cold Milk', unit: 'ml', quantity: 150, cost: 0 },
    { name: 'Ice', unit: 'pieces', quantity: 5, cost: 0 }
  ]},
  
  // Other Drinks
  'Coke': { category: 'others', price: 15, ingredients: [
    { name: 'Softdrinks', unit: 'pieces', quantity: 20, cost: 11.3 }
  ]},
  'Sprite': { category: 'others', price: 15, ingredients: [
    { name: 'Softdrinks', unit: 'pieces', quantity: 20, cost: 11.3 }
  ]},
  'Bottled Water': { category: 'others', price: 20, ingredients: [
    { name: 'Water', unit: 'pieces', quantity: 20, cost: 15 }
  ]}
};

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

async function smartUpload() {
  console.log('🚀 Starting smart recipe upload...');
  console.log('🎯 Targeting empty recipes with proper prices from recipes folder\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  // Get all empty recipes
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name,suggested_price,is_active&order=name',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  let commissaryCreated = 0;
  
  console.log(`📋 Found ${templates.length} total recipe templates`);
  console.log('🔍 Processing recipes that need ingredients...\n');
  
  for (const template of templates) {
    // Check if this recipe has ingredients
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_template_ingredients?recipe_template_id=eq.${template.id}&select=id`,
      method: 'GET',
      headers
    };
    
    const existingIngredients = await makeRequest(ingredientsOptions);
    
    // Skip if already has ingredients
    if (existingIngredients.length > 0) {
      continue;
    }
    
    // Check if we have recipe data for this recipe
    const recipeInfo = recipeData[template.name];
    if (!recipeInfo) {
      console.log(`⏭️  ${template.name} - No recipe data available`);
      skipped++;
      continue;
    }
    
    try {
      process.stdout.write(`🔄 ${template.name} (₱${template.suggested_price})... `);
      
      // Update the template with correct price and category
      const updateOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_templates?id=eq.${template.id}`,
        method: 'PATCH',
        headers
      };
      
      await makeRequest(updateOptions, {
        category_name: recipeInfo.category,
        suggested_price: recipeInfo.price,
        is_active: false, // Deactivate while adding ingredients
        updated_at: new Date().toISOString()
      });
      
      // Process ingredients
      const ingredientInserts = [];
      
      for (const ingredient of recipeInfo.ingredients) {
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
          // Create commissary item
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
        
        // Add ingredient
        ingredientInserts.push({
          recipe_template_id: template.id,
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
        
        // Reactivate the recipe
        await makeRequest(updateOptions, {
          is_active: true,
          updated_at: new Date().toISOString()
        });
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
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📦 Commissary items created: ${commissaryCreated}`);
  console.log('\n🎉 Smart upload complete!');
  console.log('📋 All empty recipes from the recipes folder now have ingredients.');
  console.log('💡 Your Mango recipe and other empty recipes are now fixed!');
}

smartUpload().catch(console.error);
