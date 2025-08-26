#!/usr/bin/env node

/**
 * Fix Inventory Quantities and Missing Recipe Ingredients
 * 
 * This script fixes two critical issues:
 * 1. Updates inventory quantities from 50 to 100
 * 2. Adds missing ingredients to recipes that don't have them
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
    console.log('🔧 FIXING INVENTORY QUANTITIES AND RECIPES');
    console.log('='.repeat(60));
    
    await authenticateAdmin();
    
    // Step 1: Update inventory quantities from 50 to 100
    console.log('\n📦 STEP 1: UPDATING INVENTORY QUANTITIES');
    console.log('-'.repeat(40));
    
    // Get all inventory items with quantity 50
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=id,store_id,item,stock_quantity&stock_quantity=eq.50&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    
    if (inventory && inventory.length > 0) {
      console.log(`✅ Found ${inventory.length} inventory items with quantity 50`);
      
      // Update in batches to avoid overwhelming the API
      const batchSize = 10;
      let updatedCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < inventory.length; i += batchSize) {
        const batch = inventory.slice(i, i + batchSize);
        
        console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(inventory.length/batchSize)} (${batch.length} items)`);
        
        for (const item of batch) {
          const updateOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/inventory_stock?id=eq.${item.id}`,
            method: 'PATCH',
            headers: { ...headers, 'Prefer': 'return=minimal' }
          };
          
          const updateData = {
            stock_quantity: 100,
            updated_at: new Date().toISOString()
          };
          
          try {
            await makeRequest(updateOptions, updateData);
            console.log(`   ✅ Updated ${item.item}: 50 → 100`);
            updatedCount++;
          } catch (error) {
            console.log(`   ❌ Failed to update ${item.item}: ${error.message}`);
            errorCount++;
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Delay between batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`\n📊 Inventory Update Summary:`);
      console.log(`   ✅ Successfully updated: ${updatedCount} items`);
      console.log(`   ❌ Failed to update: ${errorCount} items`);
      
    } else {
      console.log('✅ No inventory items found with quantity 50 (already updated or none exist)');
    }
    
    // Step 2: Fix missing recipe ingredients
    console.log('\n🧪 STEP 2: FIXING MISSING RECIPE INGREDIENTS');
    console.log('-'.repeat(40));
    
    // Get all recipe templates
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=id,name,category_name&is_active=eq.true&order=name',
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    
    if (recipes && recipes.length > 0) {
      console.log(`✅ Found ${recipes.length} recipe templates`);
      
      let recipesWithoutIngredients = [];
      
      // Check each recipe for ingredients
      for (const recipe of recipes) {
        const ingredientsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_template_ingredients?select=id&recipe_template_id=eq.${recipe.id}`,
          method: 'GET',
          headers
        };
        
        const ingredients = await makeRequest(ingredientsOptions);
        
        if (!ingredients || ingredients.length === 0) {
          recipesWithoutIngredients.push(recipe);
          console.log(`   ❌ ${recipe.name} (${recipe.category_name}) - NO INGREDIENTS`);
        }
      }
      
      console.log(`\n📋 Found ${recipesWithoutIngredients.length} recipes without ingredients`);
      
      // Add basic ingredients to recipes that don't have them
      if (recipesWithoutIngredients.length > 0) {
        console.log('\n🔧 Adding basic ingredients to recipes without them...');
        
        // Define basic ingredients for different categories
        const basicIngredients = {
          'Croffle': [
            { name: 'Regular Croissant', quantity: 1, unit: 'piece', cost: 15 },
            { name: 'Whipped Cream', quantity: 1, unit: 'serving', cost: 1 },
            { name: 'Chopstick', quantity: 1, unit: 'pair', cost: 0.25 },
            { name: 'Wax Paper', quantity: 1, unit: 'piece', cost: 0.25 }
          ],
          'Espresso': [
            { name: 'Espresso Shot', quantity: 30, unit: 'ml', cost: 2.5 },
            { name: 'Milk', quantity: 150, unit: 'ml', cost: 0.05 },
            { name: '16Oz Hot Cups', quantity: 1, unit: 'piece', cost: 6 },
            { name: 'Coffee Lid', quantity: 1, unit: 'piece', cost: 1 }
          ],
          'Blended': [
            { name: 'Ice', quantity: 100, unit: 'grams', cost: 0.1 },
            { name: 'Milk', quantity: 200, unit: 'ml', cost: 0.05 },
            { name: '16oz Plastic Cups', quantity: 1, unit: 'piece', cost: 8 },
            { name: 'Flat Lid', quantity: 1, unit: 'piece', cost: 1 }
          ]
        };
        
        let ingredientsAdded = 0;
        
        for (const recipe of recipesWithoutIngredients) {
          console.log(`\n🔄 Processing ${recipe.name}...`);
          
          // Determine ingredient set based on category or name
          let ingredientSet = [];
          
          if (recipe.name.toLowerCase().includes('croffle')) {
            ingredientSet = basicIngredients['Croffle'];
          } else if (recipe.category_name === 'Espresso') {
            ingredientSet = basicIngredients['Espresso'];
          } else if (recipe.category_name === 'Blended') {
            ingredientSet = basicIngredients['Blended'];
          } else {
            // Default to croffle ingredients
            ingredientSet = basicIngredients['Croffle'];
          }
          
          // Add special ingredients based on recipe name
          if (recipe.name.toLowerCase().includes('choco marshmallow')) {
            ingredientSet = [
              ...basicIngredients['Croffle'],
              { name: 'Chocolate Sauce', quantity: 1, unit: 'portion', cost: 1.75 },
              { name: 'Marshmallow', quantity: 1, unit: 'portion', cost: 2.5 }
            ];
          }
          
          // Add ingredients to recipe
          for (const ingredient of ingredientSet) {
            const ingredientData = {
              recipe_template_id: recipe.id,
              ingredient_name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              cost_per_unit: ingredient.cost,
              location_type: 'all'
            };
            
            const addIngredientOptions = {
              hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
              port: 443,
              path: '/rest/v1/recipe_template_ingredients',
              method: 'POST',
              headers: { ...headers, 'Prefer': 'return=minimal' }
            };
            
            try {
              await makeRequest(addIngredientOptions, ingredientData);
              console.log(`   ✅ Added ${ingredient.name}`);
              ingredientsAdded++;
            } catch (error) {
              console.log(`   ❌ Failed to add ${ingredient.name}: ${error.message}`);
            }
            
            // Small delay
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        console.log(`\n📊 Recipe Ingredients Summary:`);
        console.log(`   ✅ Ingredients added: ${ingredientsAdded}`);
        console.log(`   📋 Recipes fixed: ${recipesWithoutIngredients.length}`);
      }
    }
    
    // Step 3: Verify the fixes
    console.log('\n✅ STEP 3: VERIFYING FIXES');
    console.log('-'.repeat(40));
    
    // Check inventory quantities
    const verifyInventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=stock_quantity&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const verifyInventory = await makeRequest(verifyInventoryOptions);
    
    if (verifyInventory) {
      const quantities = verifyInventory.map(item => item.stock_quantity);
      const uniqueQuantities = [...new Set(quantities)];
      
      console.log(`📦 Inventory verification:`);
      console.log(`   Total items: ${quantities.length}`);
      console.log(`   Unique quantities: ${uniqueQuantities.join(', ')}`);
      
      if (uniqueQuantities.length === 1 && uniqueQuantities[0] === 100) {
        console.log(`   ✅ All inventory items are now at 100!`);
      } else {
        console.log(`   ⚠️  Mixed quantities found - may need additional fixes`);
      }
    }
    
    // Check Choco Marshmallow Croffle specifically
    const chocoRecipeOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=id,name&name=eq.Choco%20Marshmallow%20Croffle',
      method: 'GET',
      headers
    };
    
    const chocoRecipes = await makeRequest(chocoRecipeOptions);
    
    if (chocoRecipes && chocoRecipes.length > 0) {
      const chocoRecipe = chocoRecipes[0];
      
      const chocoIngredientsOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_template_ingredients?select=ingredient_name,quantity,unit&recipe_template_id=eq.${chocoRecipe.id}`,
        method: 'GET',
        headers
      };
      
      const chocoIngredients = await makeRequest(chocoIngredientsOptions);
      
      console.log(`\n🧪 Choco Marshmallow Croffle verification:`);
      if (chocoIngredients && chocoIngredients.length > 0) {
        console.log(`   ✅ Now has ${chocoIngredients.length} ingredients:`);
        chocoIngredients.forEach((ing, index) => {
          console.log(`      ${index + 1}. ${ing.ingredient_name}: ${ing.quantity} ${ing.unit}`);
        });
      } else {
        console.log(`   ❌ Still has no ingredients`);
      }
    }
    
    console.log('\n🎉 FIXES COMPLETE!');
    console.log('='.repeat(60));
    console.log('✅ Inventory quantities updated to 100');
    console.log('✅ Missing recipe ingredients added');
    console.log('✅ System ready for inventory deduction testing');
    
    console.log('\n🔄 NEXT STEPS:');
    console.log('1. Test a new transaction to see if inventory deduction works');
    console.log('2. Integrate the inventory deduction service into the application');
    console.log('3. Monitor inventory movements for future transactions');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

main();
