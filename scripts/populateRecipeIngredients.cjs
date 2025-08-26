#!/usr/bin/env node

/**
 * Populate Recipe Ingredients
 * 
 * This script populates recipe ingredients based on the recipe files
 * to enable proper inventory deduction.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// Recipe ingredients from addon recipe file
const ADDON_INGREDIENTS = [
  { product: 'Colored Sprinkles', ingredient: 'Colored Sprinkles', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Marshmallow', ingredient: 'Marshmallow', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Choco Flakes', ingredient: 'Choco Flakes', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Peanut', ingredient: 'Peanut', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Caramel', ingredient: 'Caramel', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Chocolate', ingredient: 'Chocolate', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Tiramisu', ingredient: 'Tiramisu', unit: 'Piece', quantity: 1, cost: 3.5 },
  { product: 'Biscoff Crushed', ingredient: 'Biscoff Crushed', unit: 'Piece', quantity: 1, cost: 5.62 },
  { product: 'Oreo Crushed', ingredient: 'Oreo Crushed', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Strawberry Jam', ingredient: 'Strawberry Jam', unit: 'Piece', quantity: 1, cost: 5 },
  { product: 'Mango Jam', ingredient: 'Mango Jam', unit: 'Piece', quantity: 1, cost: 7 },
  { product: 'Blueberry Jam', ingredient: 'Blueberry Jam', unit: 'Piece', quantity: 1, cost: 7.5 },
  { product: 'Nutella', ingredient: 'Nutella', unit: 'Piece', quantity: 1, cost: 4.5 },
  { product: 'Dark Chocolate', ingredient: 'Dark Chocolate', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Biscoff', ingredient: 'Biscoff', unit: 'Piece', quantity: 1, cost: 2.5 },
  { product: 'Oreo Cookies', ingredient: 'Oreo Cookies', unit: 'Piece', quantity: 1, cost: 2.9 },
  { product: 'KitKat', ingredient: 'KitKat', unit: 'Piece', quantity: 1, cost: 6.25 }
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
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
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
  console.log('🔐 Authenticating as admin...');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers
  };
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const authResult = await makeRequest(authOptions, authData);
    console.log('✅ Admin authentication successful\n');
    
    // Update headers with the access token
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    
    return authResult;
  } catch (error) {
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function populateRecipeIngredients() {
  console.log('🍽️ POPULATING RECIPE INGREDIENTS');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Step 1: Get all recipes in Sugbo Mercado
    console.log('📋 STEP 1: GETTING RECIPES IN SUGBO MERCADO');
    console.log('-'.repeat(40));
    
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*&store_id=eq.${SUGBO_STORE_ID}`,
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    console.log(`✅ Found ${recipes.length} recipes in Sugbo Mercado`);
    
    // Step 2: Get store inventory items for mapping
    console.log('\n📦 STEP 2: GETTING STORE INVENTORY ITEMS');
    console.log('-'.repeat(40));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_stock?select=*&store_id=eq.${SUGBO_STORE_ID}`,
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    console.log(`✅ Found ${inventory.length} inventory items`);
    
    // Create a mapping of ingredient names to inventory IDs
    const inventoryMap = {};
    inventory.forEach(item => {
      const itemName = item.item.toLowerCase();
      inventoryMap[itemName] = item.id;
    });
    
    // Step 3: Process Oreo Cookies specifically
    console.log('\n🍪 STEP 3: PROCESSING OREO COOKIES RECIPE');
    console.log('-'.repeat(40));
    
    const oreoRecipe = recipes.find(r => r.name.toLowerCase().includes('oreo cookies'));
    
    if (!oreoRecipe) {
      console.log('❌ Oreo Cookies recipe not found');
      return;
    }
    
    console.log(`✅ Found Oreo Cookies recipe: ${oreoRecipe.id}`);
    
    // Find Oreo Cookies ingredient data
    const oreoIngredientData = ADDON_INGREDIENTS.find(ing => ing.product === 'Oreo Cookies');
    
    if (!oreoIngredientData) {
      console.log('❌ Oreo Cookies ingredient data not found');
      return;
    }
    
    // Find matching inventory item
    const inventoryItemId = inventoryMap['oreo cookies'];
    
    if (!inventoryItemId) {
      console.log('❌ Oreo Cookies inventory item not found');
      console.log('Available inventory items:');
      inventory.forEach(item => {
        console.log(`   - ${item.item}`);
      });
      return;
    }
    
    console.log(`✅ Found matching inventory item: ${inventoryItemId}`);
    
    // Step 4: Add recipe ingredient
    console.log('\n➕ STEP 4: ADDING RECIPE INGREDIENT');
    console.log('-'.repeat(40));
    
    const ingredientData = {
      recipe_id: oreoRecipe.id,
      inventory_stock_id: inventoryItemId,
      quantity: oreoIngredientData.quantity,
      unit: 'pieces', // Use valid enum value
      ingredient_name: oreoIngredientData.ingredient,
      cost_per_unit: oreoIngredientData.cost,
      notes: `Auto-generated from recipe file`
    };
    
    const addIngredientOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_ingredients',
      method: 'POST',
      headers
    };
    
    try {
      const result = await makeRequest(addIngredientOptions, ingredientData);
      console.log('✅ Successfully added Oreo Cookies recipe ingredient');
      console.log(`   Recipe: ${oreoRecipe.name}`);
      console.log(`   Ingredient: ${oreoIngredientData.ingredient}`);
      console.log(`   Quantity: ${oreoIngredientData.quantity} ${oreoIngredientData.unit}`);
      console.log(`   Cost: ₱${oreoIngredientData.cost}`);
    } catch (error) {
      console.log('❌ Failed to add recipe ingredient:', error.message);
      
      // Check if ingredient already exists
      const checkOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${oreoRecipe.id}`,
        method: 'GET',
        headers
      };
      
      const existingIngredients = await makeRequest(checkOptions);
      if (existingIngredients.length > 0) {
        console.log('✅ Recipe ingredient already exists');
      }
    }
    
    // Step 5: Test the setup
    console.log('\n🧪 STEP 5: TESTING THE SETUP');
    console.log('-'.repeat(40));
    
    const testOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_ingredients?select=*,inventory_stock(*)&recipe_id=eq.${oreoRecipe.id}`,
      method: 'GET',
      headers
    };
    
    const recipeIngredients = await makeRequest(testOptions);
    console.log(`✅ Recipe now has ${recipeIngredients.length} ingredients`);

    if (recipeIngredients.length > 0) {
      recipeIngredients.forEach(ing => {
        console.log(`   - ${ing.inventory_stock?.item}: ${ing.quantity} ${ing.unit}`);
      });
    }
    
    // Step 6: Summary and next steps
    console.log('\n🎯 SUMMARY AND NEXT STEPS');
    console.log('='.repeat(50));
    
    if (recipeIngredients.length > 0) {
      console.log('✅ SUCCESS: Oreo Cookies recipe now has ingredients!');
      console.log('\n📋 What this enables:');
      console.log('   ✅ Inventory deduction when orders are placed');
      console.log('   ✅ Stock level checking before orders');
      console.log('   ✅ Inventory movement logging');
      console.log('   ✅ Automatic stock alerts');
      
      console.log('\n🧪 To test inventory deduction:');
      console.log('   1. Go to POS system');
      console.log('   2. Add Oreo Cookies to cart');
      console.log('   3. Complete the transaction');
      console.log('   4. Check inventory movements table');
      console.log('   5. Verify inventory stock decreased');
    } else {
      console.log('❌ FAILED: Recipe still has no ingredients');
      console.log('\n🔧 Manual steps needed:');
      console.log('   1. Check recipe_ingredients table structure');
      console.log('   2. Verify inventory_stock table has Oreo Cookies item');
      console.log('   3. Add ingredient manually through admin panel');
    }
    
  } catch (error) {
    console.error('❌ Error populating recipe ingredients:', error.message);
  }
}

// Run the population
populateRecipeIngredients();
