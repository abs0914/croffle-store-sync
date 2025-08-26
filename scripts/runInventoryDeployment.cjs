#!/usr/bin/env node

/**
 * Run Inventory Deployment
 * 
 * This script runs the inventory deployment migration manually to deploy all inventory items.
 */

const https = require('https');
const fs = require('fs');

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

async function clearExistingInventory() {
  console.log('🧹 Clearing existing inventory stock...');

  // First get all existing inventory to delete
  const getOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/inventory_stock?select=id',
    method: 'GET',
    headers
  };

  const existingInventory = await makeRequest(getOptions);
  console.log(`   Found ${existingInventory.length} existing inventory items to clear`);

  if (existingInventory.length > 0) {
    // Delete in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < existingInventory.length; i += batchSize) {
      const batch = existingInventory.slice(i, i + batchSize);
      const ids = batch.map(item => item.id);

      const clearOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_stock?id=in.(${ids.map(id => `"${id}"`).join(',')})`,
        method: 'DELETE',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      };

      await makeRequest(clearOptions);

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log('   ✅ Cleared existing inventory stock');
}

async function deployInventoryItems() {
  console.log('📦 Deploying inventory items...');
  
  // Get unique ingredients from recipe templates
  const ingredientsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_template_ingredients?select=ingredient_name,unit,cost_per_unit',
    method: 'GET',
    headers
  };
  
  const ingredients = await makeRequest(ingredientsOptions);
  
  // Get unique ingredients - use ingredient_name as the key since that's what the unique constraint is on
  const uniqueIngredients = [];
  const seen = new Set();

  ingredients.forEach(ing => {
    const key = ing.ingredient_name; // Only use ingredient name for uniqueness
    if (!seen.has(key)) {
      seen.add(key);
      uniqueIngredients.push(ing);
    }
  });

  console.log(`   Sample unique ingredients:`);
  uniqueIngredients.slice(0, 10).forEach((ing, index) => {
    console.log(`      ${index + 1}. ${ing.ingredient_name} (${ing.unit}, ₱${ing.cost_per_unit})`);
  });
  
  console.log(`   Found ${uniqueIngredients.length} unique ingredients to deploy`);
  
  // Get active stores
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  console.log(`   Found ${stores.length} active stores`);
  
  // Create inventory items for each store
  let totalCreated = 0;
  
  for (const store of stores) {
    console.log(`\n   🏪 Deploying inventory for ${store.name}...`);
    
    const inventoryItems = uniqueIngredients.map(ing => ({
      store_id: store.id,
      item: ing.ingredient_name,
      item_category: categorizeIngredient(ing.ingredient_name),
      unit: normalizeUnit(ing.unit),
      stock_quantity: 50,
      minimum_threshold: 5,
      cost: ing.cost_per_unit,
      is_active: true,
      recipe_compatible: true
    }));
    
    // Insert in batches to avoid timeout
    const batchSize = 20;
    for (let i = 0; i < inventoryItems.length; i += batchSize) {
      const batch = inventoryItems.slice(i, i + batchSize);
      
      const insertOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/inventory_stock',
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      };
      
      await makeRequest(insertOptions, batch);
      totalCreated += batch.length;
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`      ✅ Created ${inventoryItems.length} inventory items`);
  }
  
  console.log(`\n   📊 Total inventory items created: ${totalCreated}`);
  return totalCreated;
}

function categorizeIngredient(ingredientName) {
  const name = ingredientName.toLowerCase();
  
  if (name.includes('sauce') && (name.includes('caramel') || name.includes('biscoff'))) {
    return 'premium_sauce';
  } else if (name.includes('sauce') || name.includes('syrup')) {
    return 'classic_sauce';
  } else if (name.includes('sprinkle') || name.includes('flake') || name.includes('crushed')) {
    return 'premium_topping';
  } else if (name.includes('jam') || name.includes('cream')) {
    return 'classic_topping';
  } else if (name.includes('cup') || name.includes('lid') || name.includes('container')) {
    return 'packaging';
  } else if (name.includes('wrapper') || name.includes('bag') || name.includes('box')) {
    return 'packaging';
  } else if (name.includes('biscuit') || name.includes('graham')) {
    return 'biscuit';
  } else {
    return 'base_ingredient';
  }
}

function normalizeUnit(unit) {
  const unitLower = unit.toLowerCase();
  
  if (unitLower === 'piece') return 'pieces';
  if (unitLower === 'pack') return 'packs';
  if (unitLower === 'box') return 'boxes';
  if (unitLower === 'liter') return 'liters';
  
  return unit;
}

async function main() {
  try {
    console.log('🚀 RUNNING INVENTORY DEPLOYMENT');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    await clearExistingInventory();
    const totalCreated = await deployInventoryItems();
    
    console.log('\n🎉 INVENTORY DEPLOYMENT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📦 Total inventory items deployed: ${totalCreated}`);
    
    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    
    const verifyOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=store_id,item&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(verifyOptions);
    
    const inventoryByStore = {};
    inventory.forEach(item => {
      if (!inventoryByStore[item.store_id]) {
        inventoryByStore[item.store_id] = 0;
      }
      inventoryByStore[item.store_id]++;
    });
    
    console.log('\n📊 Inventory by store:');
    Object.entries(inventoryByStore).forEach(([storeId, count]) => {
      console.log(`   Store ${storeId}: ${count} items`);
    });
    
    const uniqueItems = [...new Set(inventory.map(item => item.item))];
    console.log(`\n✅ Verification complete:`);
    console.log(`   Total inventory records: ${inventory.length}`);
    console.log(`   Unique items: ${uniqueItems.length}`);
    console.log(`   Stores with inventory: ${Object.keys(inventoryByStore).length}`);
    
    if (inventory.length >= 400) {
      console.log('\n🎯 SUCCESS: Inventory deployment appears complete!');
      console.log('   All stores should now have the expected inventory items.');
    } else {
      console.log('\n⚠️  WARNING: Inventory deployment may be incomplete.');
      console.log(`   Expected ~440 items (55 ingredients × 8 stores), got ${inventory.length}`);
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();
