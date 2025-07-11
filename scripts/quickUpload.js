#!/usr/bin/env node

/**
 * Quick Recipe Upload Script
 * 
 * Usage:
 *   node scripts/quickUpload.js
 * 
 * This script uploads all recipes using the service role key (no auth needed).
 * Make sure to update the SERVICE_ROLE_KEY below.
 */

const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// You'll need to get this from your Supabase dashboard > Settings > API
const SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

// Default user ID (you can get this from your admin user)
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// Recipe data (condensed for terminal script)
const recipes = [
  // Classic Croffles
  { name: 'Tiramisu', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Tiramisu', 'portion', 1, 3.5], ['Choco Flakes', 'portion', 1, 2.5],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Choco Nut', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Chocolate', 'portion', 1, 2.5], ['Peanut', 'portion', 1, 2.5],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Caramel Delight', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Caramel', 'portion', 1, 2.5], ['Colored Sprinkles', 'portion', 1, 2.5],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Choco Marshmallow', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Chocolate', 'portion', 1, 2.5], ['Marshmallow', 'portion', 1, 2.5],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Strawberry', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Strawberry Jam', 'scoop', 1, 5], ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Mango', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Mango Jam', 'scoop', 1, 7], ['Graham Crushed', 'portion', 1, 2.5],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Blueberry', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Blueberry Jam', 'scoop', 1, 7.5], ['Graham Crushed', 'portion', 1, 2.5],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Biscoff', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Biscoff Crushed', 'portion', 1, 5], ['Biscoff', 'piece', 1, 5.62],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Nutella', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Nutella', 'portion', 1, 4.5], ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'KitKat', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Chocolate', 'portion', 1, 2.5], ['KitKat', 'piece', 0.5, 6.25],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Cookies & Cream', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Oreo Crushed', 'portion', 1, 2.5], ['Oreo Cookies', 'piece', 1, 2.9],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Choco Overload', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Chocolate', 'portion', 1, 2.5], ['Choco Flakes', 'portion', 1, 2.5],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Matcha', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Matcha Crumble', 'portion', 1, 2.5], ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  { name: 'Dark Chocolate', cat: 'classic', price: 125, ing: [
    ['Regular Croissant', 'piece', 1, 30], ['Whipped Cream', 'serving', 1, 8],
    ['Dark Chocolate', 'portion', 1, 2.5], ['Chocolate Crumble', 'portion', 1, 2.5],
    ['Chopstick', 'pair', 1, 0.6], ['Wax Paper', 'piece', 1, 0.7]
  ]},
  
  // Coffee Drinks
  { name: 'Americano (Hot)', cat: 'espresso', price: 65, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Hot Water', 'ml', 150, 0]
  ]},
  { name: 'Americano (Iced)', cat: 'espresso', price: 70, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Cold Water', 'ml', 100, 0], ['Ice', 'cubes', 5, 0]
  ]},
  { name: 'Cappuccino (Hot)', cat: 'espresso', price: 75, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Steamed Milk', 'ml', 120, 0], ['Milk Foam', 'ml', 30, 0]
  ]},
  { name: 'Cappuccino (Iced)', cat: 'espresso', price: 80, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Cold Milk', 'ml', 120, 0], ['Ice', 'cubes', 5, 0]
  ]},
  { name: 'Café Latte (Hot)', cat: 'espresso', price: 75, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Steamed Milk', 'ml', 180, 0]
  ]},
  { name: 'Café Latte (Iced)', cat: 'espresso', price: 80, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Cold Milk', 'ml', 180, 0], ['Ice', 'cubes', 5, 0]
  ]},
  { name: 'Café Mocha (Hot)', cat: 'espresso', price: 80, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Chocolate Syrup', 'pump', 1, 0], ['Steamed Milk', 'ml', 150, 0]
  ]},
  { name: 'Café Mocha (Iced)', cat: 'espresso', price: 85, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Chocolate Syrup', 'pump', 1, 0], ['Cold Milk', 'ml', 150, 0], ['Ice', 'cubes', 5, 0]
  ]},
  { name: 'Caramel Latte (Hot)', cat: 'espresso', price: 80, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Caramel Syrup', 'pump', 1, 0], ['Steamed Milk', 'ml', 150, 0]
  ]},
  { name: 'Caramel Latte (Iced)', cat: 'espresso', price: 85, ing: [
    ['Espresso Shot', 'shot', 1, 0], ['Caramel Syrup', 'pump', 1, 0], ['Cold Milk', 'ml', 150, 0], ['Ice', 'cubes', 5, 0]
  ]},
  
  // Other Drinks
  { name: 'Coke', cat: 'others', price: 15, ing: [['Softdrinks', 'piece', 20, 11.3]] },
  { name: 'Sprite', cat: 'others', price: 15, ing: [['Softdrinks', 'piece', 20, 11.3]] },
  { name: 'Bottled Water', cat: 'others', price: 20, ing: [['Water', 'piece', 20, 15]] }
];

// HTTP request helper
function req(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1${path}`,
      method,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    
    const request = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
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
    
    request.on('error', reject);
    if (data) request.write(JSON.stringify(data));
    request.end();
  });
}

// Main upload function
async function upload() {
  if (SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('❌ Please update SERVICE_ROLE_KEY in the script');
    console.log('💡 Get it from: Supabase Dashboard > Settings > API > service_role key');
    process.exit(1);
  }
  
  console.log('🚀 Quick Recipe Upload');
  console.log(`📊 Processing ${recipes.length} recipes\n`);
  
  let success = 0, failed = 0, commissaryCreated = 0;
  
  for (const recipe of recipes) {
    try {
      process.stdout.write(`🔄 ${recipe.name}... `);
      
      const totalCost = recipe.ing.reduce((sum, [,, qty, cost]) => sum + (qty * cost), 0);
      
      // Check existing template
      const existing = await req(`/recipe_templates?name=eq.${encodeURIComponent(recipe.name)}&select=id`);
      let templateId;
      
      if (existing.length > 0) {
        templateId = existing[0].id;
        // Update existing
        await req(`/recipe_templates?id=eq.${templateId}`, 'PATCH', {
          category_name: recipe.cat,
          total_cost: totalCost,
          suggested_price: recipe.price,
          updated_at: new Date().toISOString()
        });
        // Delete old ingredients
        await req(`/recipe_template_ingredients?recipe_template_id=eq.${templateId}`, 'DELETE');
      } else {
        // Create new template
        const newTemplate = await req('/recipe_templates', 'POST', {
          name: recipe.name,
          description: `${recipe.name} recipe`,
          category_name: recipe.cat,
          instructions: `Prepare ${recipe.name}`,
          yield_quantity: 1,
          serving_size: 1,
          total_cost: totalCost,
          suggested_price: recipe.price,
          version: 1,
          is_active: true,
          created_by: DEFAULT_USER_ID
        });
        templateId = newTemplate[0].id;
      }
      
      // Process ingredients
      const ingredientInserts = [];
      for (const [name, unit, qty, cost] of recipe.ing) {
        // Find or create commissary item
        const items = await req(`/commissary_inventory?name=eq.${encodeURIComponent(name)}&is_active=eq.true&select=id`);
        let itemId;
        
        if (items.length === 0) {
          // Create commissary item
          const newItem = await req('/commissary_inventory', 'POST', {
            name, category: 'raw_materials', item_type: 'raw_material',
            current_stock: 100, minimum_threshold: 10, unit, unit_cost: cost, is_active: true
          });
          itemId = newItem[0].id;
          commissaryCreated++;
        } else {
          itemId = items[0].id;
        }
        
        ingredientInserts.push({
          recipe_template_id: templateId, commissary_item_id: itemId,
          ingredient_name: name, commissary_item_name: name,
          quantity: qty, unit, cost_per_unit: cost, recipe_unit: unit,
          purchase_unit: unit, conversion_factor: 1, location_type: 'all'
        });
      }
      
      // Insert ingredients
      if (ingredientInserts.length > 0) {
        await req('/recipe_template_ingredients', 'POST', ingredientInserts);
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
}

upload().catch(console.error);
