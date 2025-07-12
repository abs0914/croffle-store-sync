#!/usr/bin/env node

/**
 * Test Recipe Matching and Inventory Deduction
 * 
 * This script tests if updated recipes match the database and tests
 * inventory deduction with Cookies & Cream Croffle.
 */

const https = require('https');
const fs = require('fs');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

const headers = {
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

function parseRecipeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('|---'));
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    const recipes = {};
    
    dataLines.forEach(line => {
      const parts = line.split('|').map(part => part.trim()).filter(part => part);
      if (parts.length >= 6) {
        const [product, category, ingredient, unit, quantity, cost, price] = parts;
        
        if (!recipes[product]) {
          recipes[product] = {
            name: product,
            category: category,
            price: parseFloat(price),
            ingredients: []
          };
        }
        
        recipes[product].ingredients.push({
          name: ingredient,
          unit: unit,
          quantity: parseFloat(quantity),
          cost: parseFloat(cost)
        });
      }
    });
    
    return Object.values(recipes);
  } catch (error) {
    console.error('Error parsing recipe file:', error.message);
    return [];
  }
}

async function testRecipeMatching() {
  console.log('🧪 TESTING RECIPE MATCHING AND INVENTORY DEDUCTION');
  console.log('='.repeat(60));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Step 1: Parse recipe files
    console.log('📋 STEP 1: PARSING RECIPE FILES');
    console.log('-'.repeat(40));
    
    const croffleRecipes = parseRecipeFile('src/scripts/recipes/croffleRecipe.md');
    const addonRecipes = parseRecipeFile('src/scripts/recipes/addonRecipe.md');
    
    console.log(`✅ Parsed ${croffleRecipes.length} croffle recipes`);
    console.log(`✅ Parsed ${addonRecipes.length} addon recipes`);
    
    // Focus on Cookies & Cream Croffle
    const cookiesCreamRecipe = croffleRecipes.find(r => r.name === 'Cookies & Cream Croffle');
    
    if (!cookiesCreamRecipe) {
      console.log('❌ Cookies & Cream Croffle not found in recipe file');
      return;
    }
    
    console.log(`\n🍪 Found Cookies & Cream Croffle with ${cookiesCreamRecipe.ingredients.length} ingredients:`);
    cookiesCreamRecipe.ingredients.forEach(ing => {
      console.log(`   - ${ing.name}: ${ing.quantity} ${ing.unit} (₱${ing.cost})`);
    });
    
    // Step 2: Check database templates
    console.log('\n📊 STEP 2: CHECKING DATABASE TEMPLATES');
    console.log('-'.repeat(40));
    
    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*&name=ilike.*cookies*cream*',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templatesOptions);
    
    if (templates.length === 0) {
      console.log('❌ No Cookies & Cream template found in database');
      return;
    }
    
    const template = templates[0];
    console.log(`✅ Found template: ${template.name} (ID: ${template.id})`);
    console.log(`   Category: ${template.category_name || template.category}`);
    console.log(`   Price: ₱${template.suggested_price}`);
    console.log(`   Active: ${template.is_active}`);
    
    // Check if template matches recipe file
    const priceMatch = template.suggested_price === cookiesCreamRecipe.price;
    const categoryMatch = (template.category_name || template.category) === cookiesCreamRecipe.category;
    
    console.log(`\n📋 Template vs Recipe File Comparison:`);
    console.log(`   Price: ${priceMatch ? '✅' : '❌'} Template: ₱${template.suggested_price}, File: ₱${cookiesCreamRecipe.price}`);
    console.log(`   Category: ${categoryMatch ? '✅' : '❌'} Template: ${template.category_name || template.category}, File: ${cookiesCreamRecipe.category}`);
    
    // Step 3: Check deployed recipe in Sugbo Mercado
    console.log('\n🏪 STEP 3: CHECKING DEPLOYED RECIPE IN SUGBO MERCADO');
    console.log('-'.repeat(40));
    
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*&store_id=eq.${SUGBO_STORE_ID}&name=ilike.*cookies*cream*`,
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    
    if (recipes.length === 0) {
      console.log('❌ No Cookies & Cream recipe deployed to Sugbo Mercado');
      return;
    }
    
    const recipe = recipes[0];
    console.log(`✅ Found deployed recipe: ${recipe.name} (ID: ${recipe.id})`);
    console.log(`   Template ID: ${recipe.template_id}`);
    console.log(`   Price: ₱${recipe.suggested_price}`);
    console.log(`   Active: ${recipe.is_active}`);
    
    // Step 4: Check recipe ingredients
    console.log('\n🍽️ STEP 4: CHECKING RECIPE INGREDIENTS');
    console.log('-'.repeat(40));
    
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_ingredients?select=*,inventory_stock(*)&recipe_id=eq.${recipe.id}`,
      method: 'GET',
      headers
    };
    
    const dbIngredients = await makeRequest(ingredientsOptions);
    console.log(`📊 Recipe has ${dbIngredients.length} ingredients in database`);
    
    if (dbIngredients.length > 0) {
      console.log('\n📋 Database ingredients:');
      dbIngredients.forEach(ing => {
        const itemName = ing.inventory_stock?.item || ing.ingredient_name || 'Unknown';
        console.log(`   - ${itemName}: ${ing.quantity} ${ing.unit}`);
      });
    }
    
    // Compare with recipe file
    console.log(`\n📋 Ingredient Comparison:`);
    console.log(`   Recipe File: ${cookiesCreamRecipe.ingredients.length} ingredients`);
    console.log(`   Database: ${dbIngredients.length} ingredients`);
    
    const ingredientMatch = dbIngredients.length === cookiesCreamRecipe.ingredients.length;
    console.log(`   Count Match: ${ingredientMatch ? '✅' : '❌'}`);
    
    // Step 5: Check current inventory levels (before test)
    console.log('\n📦 STEP 5: CHECKING CURRENT INVENTORY LEVELS');
    console.log('-'.repeat(40));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_stock?select=*&store_id=eq.${SUGBO_STORE_ID}`,
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    
    // Find relevant inventory items
    const relevantItems = inventory.filter(item => {
      const itemName = item.item.toLowerCase();
      return itemName.includes('croissant') || 
             itemName.includes('cream') || 
             itemName.includes('oreo') ||
             itemName.includes('chopstick') ||
             itemName.includes('wax');
    });
    
    console.log(`📊 Found ${relevantItems.length} relevant inventory items:`);
    const inventorySnapshot = {};
    
    relevantItems.forEach(item => {
      console.log(`   - ${item.item}: ${item.stock_quantity} ${item.unit}`);
      inventorySnapshot[item.item] = item.stock_quantity;
    });
    
    // Step 6: Check product catalog
    console.log('\n🛍️ STEP 6: CHECKING PRODUCT CATALOG');
    console.log('-'.repeat(40));
    
    const productsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/product_catalog?select=*&store_id=eq.${SUGBO_STORE_ID}&product_name=ilike.*cookies*cream*`,
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productsOptions);
    
    if (products.length === 0) {
      console.log('❌ No Cookies & Cream product in catalog');
      return;
    }
    
    const product = products[0];
    console.log(`✅ Found product: ${product.product_name} (ID: ${product.id})`);
    console.log(`   Price: ₱${product.price}`);
    console.log(`   Available: ${product.is_available}`);
    console.log(`   Recipe ID: ${product.recipe_id}`);
    console.log(`   Category: ${product.category}`);
    
    const productLinked = product.recipe_id === recipe.id;
    console.log(`   Recipe Link: ${productLinked ? '✅ Correctly linked' : '❌ Not linked'}`);
    
    // Step 7: Summary of readiness for inventory deduction test
    console.log('\n🎯 STEP 7: INVENTORY DEDUCTION READINESS SUMMARY');
    console.log('='.repeat(60));
    
    const readinessChecks = [
      { name: 'Template exists', status: templates.length > 0 },
      { name: 'Recipe deployed', status: recipes.length > 0 },
      { name: 'Recipe has ingredients', status: dbIngredients.length > 0 },
      { name: 'Product in catalog', status: products.length > 0 },
      { name: 'Product linked to recipe', status: productLinked },
      { name: 'Inventory items available', status: relevantItems.length > 0 },
      { name: 'Template price matches file', status: priceMatch },
      { name: 'Template category matches file', status: categoryMatch }
    ];
    
    console.log('📊 Readiness Checklist:');
    readinessChecks.forEach(check => {
      console.log(`   ${check.status ? '✅' : '❌'} ${check.name}`);
    });
    
    const allReady = readinessChecks.every(check => check.status);
    
    console.log(`\n🚦 Overall Status: ${allReady ? '✅ READY FOR TESTING' : '❌ NEEDS FIXES'}`);
    
    if (allReady) {
      console.log('\n🧪 READY TO TEST INVENTORY DEDUCTION!');
      console.log('📋 Test Instructions:');
      console.log('   1. Go to POS: https://preview--croffle-store-sync.lovable.app/');
      console.log('   2. Select Sugbo Mercado store');
      console.log('   3. Add "Cookies & Cream Croffle" to cart');
      console.log('   4. Complete the transaction');
      console.log('   5. Check inventory levels after transaction');
      
      console.log('\n📊 Expected Inventory Deductions:');
      cookiesCreamRecipe.ingredients.forEach(ing => {
        console.log(`   - ${ing.name}: -${ing.quantity} ${ing.unit}`);
      });
      
      console.log('\n📦 Current Inventory Snapshot:');
      Object.entries(inventorySnapshot).forEach(([item, quantity]) => {
        console.log(`   - ${item}: ${quantity}`);
      });
    } else {
      console.log('\n🔧 Issues to fix before testing:');
      readinessChecks.filter(check => !check.status).forEach(check => {
        console.log(`   ❌ ${check.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run the test
testRecipeMatching();
