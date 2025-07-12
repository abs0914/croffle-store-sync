#!/usr/bin/env node

/**
 * Check Store Inventory Status
 * 
 * This script checks inventory status for all stores to understand
 * why deployment failed.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

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
    
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    return authResult;
  } catch (error) {
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function checkStoreInventory() {
  console.log('📦 CHECKING STORE INVENTORY STATUS');
  console.log('='.repeat(40));
  
  try {
    await authenticateAdmin();
    
    // Get all stores
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=*',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    console.log(`🏪 Found ${stores.length} stores\n`);
    
    // Required ingredients for Cookies & Cream
    const requiredIngredients = [
      'REGULAR CROISSANT',
      'WHIPPED CREAM', 
      'Oreo Crushed',
      'Oreo Cookies',
      'Chopstick',
      'Wax Paper'
    ];
    
    for (const store of stores) {
      console.log(`🏪 ${store.name} (${store.location})`);
      console.log(`   ID: ${store.id}`);
      
      // Get inventory for this store
      const inventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}`,
        method: 'GET',
        headers
      };
      
      const inventory = await makeRequest(inventoryOptions);
      console.log(`   📦 Inventory items: ${inventory.length}`);
      
      if (inventory.length === 0) {
        console.log(`   ❌ NO INVENTORY ITEMS - Store needs inventory setup`);
      } else {
        // Check for required ingredients
        const availableIngredients = inventory.map(item => item.item);
        const missingIngredients = requiredIngredients.filter(required => 
          !availableIngredients.some(available => 
            available.toLowerCase() === required.toLowerCase()
          )
        );
        
        console.log(`   ✅ Available ingredients: ${availableIngredients.length}`);
        console.log(`   📋 Sample items: ${availableIngredients.slice(0, 3).join(', ')}`);
        
        if (missingIngredients.length > 0) {
          console.log(`   ⚠️ Missing for Cookies & Cream: ${missingIngredients.join(', ')}`);
        } else {
          console.log(`   ✅ All Cookies & Cream ingredients available`);
        }
      }
      
      // Check if Cookies & Cream recipe exists
      const recipeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipes?select=*&store_id=eq.${store.id}&name=ilike.*cookies*cream*`,
        method: 'GET',
        headers
      };
      
      const recipes = await makeRequest(recipeOptions);
      
      if (recipes.length > 0) {
        console.log(`   ✅ Cookies & Cream recipe: EXISTS (ID: ${recipes[0].id})`);
        
        // Check recipe ingredients
        const ingredientsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${recipes[0].id}`,
          method: 'GET',
          headers
        };
        
        const recipeIngredients = await makeRequest(ingredientsOptions);
        console.log(`   📋 Recipe ingredients: ${recipeIngredients.length}/6`);
      } else {
        console.log(`   ❌ Cookies & Cream recipe: NOT FOUND`);
      }
      
      // Check product catalog
      const productOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/product_catalog?select=*&store_id=eq.${store.id}&product_name=ilike.*cookies*cream*`,
        method: 'GET',
        headers
      };
      
      const products = await makeRequest(productOptions);
      
      if (products.length > 0) {
        console.log(`   ✅ Product catalog: EXISTS (ID: ${products[0].id})`);
      } else {
        console.log(`   ❌ Product catalog: NOT FOUND`);
      }
      
      console.log(''); // Empty line between stores
    }
    
    // Summary and recommendations
    console.log('📋 DEPLOYMENT READINESS SUMMARY');
    console.log('='.repeat(40));
    
    const storesWithInventory = [];
    const storesWithoutInventory = [];
    
    for (const store of stores) {
      const inventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=id&store_id=eq.${store.id}`,
        method: 'GET',
        headers
      };
      
      const inventory = await makeRequest(inventoryOptions);
      
      if (inventory.length > 0) {
        storesWithInventory.push(store.name);
      } else {
        storesWithoutInventory.push(store.name);
      }
    }
    
    console.log(`✅ Stores with inventory (${storesWithInventory.length}): ${storesWithInventory.join(', ')}`);
    console.log(`❌ Stores without inventory (${storesWithoutInventory.length}): ${storesWithoutInventory.join(', ')}`);
    
    console.log('\n📋 RECOMMENDATIONS:');
    
    if (storesWithoutInventory.length > 0) {
      console.log('1. ❌ Cannot deploy Cookies & Cream to stores without inventory');
      console.log('2. 🔧 Need to set up inventory for these stores first');
      console.log('3. 📋 Focus deployment on stores with existing inventory');
    }
    
    if (storesWithInventory.length > 1) {
      console.log('4. ✅ Can test deployment on stores with inventory');
      console.log('5. 🧪 Recommend testing on one store first');
    }
    
  } catch (error) {
    console.error('❌ Error checking inventory:', error.message);
  }
}

// Run the check
checkStoreInventory();
