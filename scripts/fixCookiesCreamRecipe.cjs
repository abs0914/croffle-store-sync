#!/usr/bin/env node

/**
 * Fix Cookies & Cream Croffle Recipe
 * 
 * This script adds the missing ingredients to the Cookies & Cream Croffle recipe
 * based on the recipe file data.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
const COOKIES_CREAM_RECIPE_ID = '70836c5c-28b1-4214-af22-017bef9e3a20';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// Cookies & Cream Croffle ingredients from recipe file
const RECIPE_INGREDIENTS = [
  { name: 'REGULAR CROISSANT', quantity: 1, unit: 'pieces', cost: 30 },
  { name: 'WHIPPED CREAM', quantity: 1, unit: 'pieces', cost: 8 },
  { name: 'Oreo Crushed', quantity: 1, unit: 'pieces', cost: 2.5 },
  { name: 'Oreo Cookies', quantity: 1, unit: 'pieces', cost: 2.9 },
  { name: 'Chopstick', quantity: 1, unit: 'pieces', cost: 0.6 },
  { name: 'Wax Paper', quantity: 1, unit: 'pieces', cost: 0.7 }
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

async function fixCookiesCreamRecipe() {
  console.log('🔧 FIXING COOKIES & CREAM CROFFLE RECIPE');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Step 1: Get store inventory for mapping
    console.log('📦 STEP 1: GETTING STORE INVENTORY FOR MAPPING');
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
    
    // Create mapping of ingredient names to inventory IDs
    const inventoryMap = {};
    inventory.forEach(item => {
      const itemName = item.item.toLowerCase();
      inventoryMap[itemName] = item.id;
    });
    
    // Step 2: Clear existing ingredients (if any)
    console.log('\n🧹 STEP 2: CLEARING EXISTING INGREDIENTS');
    console.log('-'.repeat(40));
    
    const deleteOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_ingredients?recipe_id=eq.${COOKIES_CREAM_RECIPE_ID}`,
      method: 'DELETE',
      headers
    };
    
    try {
      await makeRequest(deleteOptions);
      console.log('✅ Cleared existing ingredients');
    } catch (error) {
      console.log('⚠️ No existing ingredients to clear');
    }
    
    // Step 3: Add new ingredients
    console.log('\n➕ STEP 3: ADDING RECIPE INGREDIENTS');
    console.log('-'.repeat(40));
    
    let successCount = 0;
    let failCount = 0;
    
    for (const ingredient of RECIPE_INGREDIENTS) {
      const inventoryItemId = inventoryMap[ingredient.name.toLowerCase()];
      
      if (!inventoryItemId) {
        console.log(`❌ ${ingredient.name} - No matching inventory item found`);
        failCount++;
        continue;
      }
      
      const ingredientData = {
        recipe_id: COOKIES_CREAM_RECIPE_ID,
        inventory_stock_id: inventoryItemId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        ingredient_name: ingredient.name,
        cost_per_unit: ingredient.cost,
        notes: 'Added from recipe file'
      };
      
      const addOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipe_ingredients',
        method: 'POST',
        headers
      };
      
      try {
        await makeRequest(addOptions, ingredientData);
        console.log(`✅ ${ingredient.name} - Added (${ingredient.quantity} ${ingredient.unit})`);
        successCount++;
      } catch (error) {
        console.log(`❌ ${ingredient.name} - Failed: ${error.message}`);
        failCount++;
      }
    }
    
    console.log(`\n📊 Results: ${successCount} added, ${failCount} failed`);
    
    // Step 4: Verify the ingredients were added
    console.log('\n✅ STEP 4: VERIFYING INGREDIENTS');
    console.log('-'.repeat(40));
    
    const verifyOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_ingredients?select=*,inventory_stock(*)&recipe_id=eq.${COOKIES_CREAM_RECIPE_ID}`,
      method: 'GET',
      headers
    };
    
    const verifyIngredients = await makeRequest(verifyOptions);
    console.log(`✅ Recipe now has ${verifyIngredients.length} ingredients:`);
    
    verifyIngredients.forEach(ing => {
      const itemName = ing.inventory_stock?.item || ing.ingredient_name;
      console.log(`   - ${itemName}: ${ing.quantity} ${ing.unit} (₱${ing.cost_per_unit})`);
    });
    
    // Step 5: Test inventory deduction readiness
    console.log('\n🧪 STEP 5: TESTING INVENTORY DEDUCTION READINESS');
    console.log('-'.repeat(40));
    
    if (verifyIngredients.length === RECIPE_INGREDIENTS.length) {
      console.log('✅ All ingredients successfully added!');
      console.log('\n🎯 INVENTORY DEDUCTION TEST READY!');
      console.log('📋 Test Instructions:');
      console.log('   1. Go to POS: https://preview--croffle-store-sync.lovable.app/');
      console.log('   2. Select Sugbo Mercado store');
      console.log('   3. Add "Cookies & Cream" to cart');
      console.log('   4. Complete the transaction');
      console.log('   5. Run verification script to check deduction');
      
      console.log('\n📦 Expected Inventory Deductions:');
      verifyIngredients.forEach(ing => {
        const itemName = ing.inventory_stock?.item || ing.ingredient_name;
        console.log(`   - ${itemName}: -${ing.quantity} ${ing.unit}`);
      });
      
      // Get current inventory levels for reference
      console.log('\n📊 Current Inventory Levels (Before Test):');
      const relevantItems = inventory.filter(item => {
        return verifyIngredients.some(ing => ing.inventory_stock_id === item.id);
      });
      
      relevantItems.forEach(item => {
        console.log(`   - ${item.item}: ${item.stock_quantity} ${item.unit}`);
      });
      
    } else {
      console.log(`❌ Only ${verifyIngredients.length}/${RECIPE_INGREDIENTS.length} ingredients added`);
      console.log('🔧 Some ingredients failed to add - check inventory mapping');
    }
    
  } catch (error) {
    console.error('❌ Error fixing recipe:', error.message);
  }
}

// Run the fix
fixCookiesCreamRecipe();
