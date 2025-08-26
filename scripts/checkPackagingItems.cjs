#!/usr/bin/env node

/**
 * Check Packaging Items Deployment Status
 * 
 * This script investigates why "Take-out box with cover", "Rectangle", 
 * and "Paper Bag #20" have failed to deploy successfully to stores.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const PACKAGING_ITEMS = [
  'Take-out box with cover',
  'Take-out box w/ cover', 
  'Rectangle',
  'Paper Bag #20'
];

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

async function checkPackagingItemsStatus() {
  console.log('📦 INVESTIGATING PACKAGING ITEMS DEPLOYMENT FAILURES');
  console.log('='.repeat(60));
  console.log('Target items:', PACKAGING_ITEMS.join(', '));
  console.log('');
  
  try {
    await authenticateAdmin();
    
    // Step 1: Check if items exist in commissary_inventory
    console.log('🏭 STEP 1: CHECKING COMMISSARY INVENTORY');
    console.log('-'.repeat(40));
    
    const commissaryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/commissary_inventory?select=*',
      method: 'GET',
      headers
    };
    
    const commissaryItems = await makeRequest(commissaryOptions);
    const foundInCommissary = commissaryItems.filter(item => 
      PACKAGING_ITEMS.some(target => 
        item.name.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(item.name.toLowerCase())
      )
    );
    
    console.log(`📋 Total commissary items: ${commissaryItems.length}`);
    console.log(`✅ Found packaging items in commissary: ${foundInCommissary.length}`);
    foundInCommissary.forEach(item => {
      console.log(`   - ${item.name} (Category: ${item.category}, Type: ${item.item_type}, Stock: ${item.current_stock} ${item.unit})`);
    });
    
    if (foundInCommissary.length === 0) {
      console.log('❌ None of the target packaging items found in commissary_inventory');
    }
    
    // Step 2: Check if items exist in product_addon_items
    console.log('\n🎯 STEP 2: CHECKING PRODUCT ADDON ITEMS');
    console.log('-'.repeat(40));
    
    const addonOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/product_addon_items?select=*',
      method: 'GET',
      headers
    };
    
    const addonItems = await makeRequest(addonOptions);
    const foundInAddons = addonItems.filter(item => 
      PACKAGING_ITEMS.some(target => 
        item.name.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(item.name.toLowerCase())
      )
    );
    
    console.log(`📋 Total addon items: ${addonItems.length}`);
    console.log(`✅ Found packaging items in addons: ${foundInAddons.length}`);
    foundInAddons.forEach(item => {
      console.log(`   - ${item.name} (Category: ${item.category}, Price: ₱${item.price}, Available: ${item.is_available})`);
    });
    
    // Step 3: Check if items exist in store inventories
    console.log('\n🏪 STEP 3: CHECKING STORE INVENTORIES');
    console.log('-'.repeat(40));
    
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id,name',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    console.log(`🏪 Checking ${stores.length} stores...\n`);
    
    let totalFoundInStores = 0;
    const storeResults = [];
    
    for (const store of stores) {
      const inventoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?select=*&store_id=eq.${store.id}`,
        method: 'GET',
        headers
      };
      
      const inventory = await makeRequest(inventoryOptions);
      const foundInStore = inventory.filter(item => 
        PACKAGING_ITEMS.some(target => 
          item.item.toLowerCase().includes(target.toLowerCase()) ||
          target.toLowerCase().includes(item.item.toLowerCase())
        )
      );
      
      totalFoundInStores += foundInStore.length;
      storeResults.push({
        store: store.name,
        storeId: store.id,
        totalItems: inventory.length,
        packagingItems: foundInStore
      });
      
      console.log(`📦 ${store.name}:`);
      console.log(`   Total inventory: ${inventory.length} items`);
      console.log(`   Packaging items found: ${foundInStore.length}`);
      foundInStore.forEach(item => {
        console.log(`     - ${item.item} (Stock: ${item.stock_quantity} ${item.unit}, Active: ${item.is_active})`);
      });
      console.log('');
    }
    
    // Step 4: Check if items are used in recipe templates
    console.log('📝 STEP 4: CHECKING RECIPE TEMPLATE INGREDIENTS');
    console.log('-'.repeat(40));
    
    const recipeIngredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?select=*',
      method: 'GET',
      headers
    };
    
    const recipeIngredients = await makeRequest(recipeIngredientsOptions);
    const foundInRecipes = recipeIngredients.filter(ingredient => 
      PACKAGING_ITEMS.some(target => 
        ingredient.ingredient_name.toLowerCase().includes(target.toLowerCase()) ||
        target.toLowerCase().includes(ingredient.ingredient_name.toLowerCase())
      )
    );
    
    console.log(`📋 Total recipe ingredients: ${recipeIngredients.length}`);
    console.log(`✅ Found packaging items in recipes: ${foundInRecipes.length}`);
    foundInRecipes.forEach(ingredient => {
      console.log(`   - ${ingredient.ingredient_name} (Qty: ${ingredient.quantity} ${ingredient.unit}, Type: ${ingredient.ingredient_type})`);
    });
    
    // Step 5: Summary and Analysis
    console.log('\n📊 DEPLOYMENT FAILURE ANALYSIS');
    console.log('='.repeat(60));
    
    console.log(`🏭 Commissary Inventory: ${foundInCommissary.length}/${PACKAGING_ITEMS.length} items found`);
    console.log(`🎯 Product Addon Items: ${foundInAddons.length}/${PACKAGING_ITEMS.length} items found`);
    console.log(`🏪 Store Inventories: ${totalFoundInStores} total occurrences across all stores`);
    console.log(`📝 Recipe Ingredients: ${foundInRecipes.length} recipe usages found`);
    
    console.log('\n🔍 ROOT CAUSE ANALYSIS:');
    
    if (foundInCommissary.length === 0 && foundInAddons.length > 0) {
      console.log('❌ ISSUE: Items exist in addon table but NOT in commissary inventory');
      console.log('💡 SOLUTION: These items need to be added to commissary_inventory table');
      console.log('   - They are currently only addon items, not inventory items');
      console.log('   - Recipe deployment requires ingredients to exist in store inventory');
      console.log('   - Store inventory is populated from commissary inventory');
    }
    
    if (foundInRecipes.length === 0) {
      console.log('ℹ️  NOTE: Items are not used as recipe ingredients');
      console.log('   - This means they are standalone products, not recipe components');
      console.log('   - Deployment failure may be related to product catalog, not recipes');
    }
    
    if (totalFoundInStores === 0) {
      console.log('❌ CRITICAL: Items are missing from ALL store inventories');
      console.log('💡 SOLUTION: Run inventory synchronization from commissary to stores');
    }
    
    console.log('\n🚀 RECOMMENDED ACTIONS:');
    console.log('1. Add missing items to commissary_inventory table');
    console.log('2. Run inventory sync script to copy from commissary to stores');
    console.log('3. Verify items appear in store inventories');
    console.log('4. Re-attempt recipe/product deployment');
    
  } catch (error) {
    console.error('❌ Error during investigation:', error.message);
  }
}

// Run the investigation
checkPackagingItemsStatus().catch(console.error);
