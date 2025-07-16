#!/usr/bin/env node

/**
 * Final Deployment Verification for Packaging Items
 * 
 * This script provides a comprehensive verification of the current state
 * and confirms if all packaging items are ready for deployment.
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
          if (body.trim() === '') {
            resolve({});
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
            } else {
              resolve(result);
            }
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({});
          } else {
            reject(new Error(`Parse error: ${e.message}`));
          }
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
    headers
  };
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const authResult = await makeRequest(authOptions, authData);
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    return authResult;
  } catch (error) {
    console.log('Auth failed:', error.message);
    return null;
  }
}

async function finalVerification() {
  console.log('🎯 FINAL DEPLOYMENT VERIFICATION FOR PACKAGING ITEMS');
  console.log('='.repeat(60));
  
  await authenticateAdmin();
  
  // Get all packaging-related recipe ingredients
  const recipeIngredientsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_template_ingredients?select=ingredient_name,recipe_template_id',
    method: 'GET',
    headers
  };
  
  const allIngredients = await makeRequest(recipeIngredientsOptions);
  const packagingIngredients = allIngredients.filter(ingredient => 
    ingredient.ingredient_name.toLowerCase().includes('take') ||
    ingredient.ingredient_name.toLowerCase().includes('box') ||
    ingredient.ingredient_name.toLowerCase().includes('rectangle') ||
    ingredient.ingredient_name.toLowerCase().includes('paper bag')
  );
  
  // Get unique ingredient names
  const uniqueIngredients = [...new Set(packagingIngredients.map(i => i.ingredient_name))];
  
  console.log('📝 RECIPE INGREDIENTS REQUIRING PACKAGING ITEMS:');
  console.log('-'.repeat(50));
  uniqueIngredients.forEach(ingredient => {
    const count = packagingIngredients.filter(i => i.ingredient_name === ingredient).length;
    console.log(`- "${ingredient}" (used in ${count} recipe ingredients)`);
  });
  
  // Get commissary items
  const commissaryOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/commissary_inventory?select=name,category,current_stock,unit',
    method: 'GET',
    headers
  };
  
  const commissaryItems = await makeRequest(commissaryOptions);
  const packagingCommissary = commissaryItems.filter(item => 
    item.name.toLowerCase().includes('take') ||
    item.name.toLowerCase().includes('box') ||
    item.name.toLowerCase().includes('rectangle') ||
    item.name.toLowerCase().includes('paper bag')
  );
  
  console.log('\n🏭 COMMISSARY PACKAGING ITEMS:');
  console.log('-'.repeat(50));
  packagingCommissary.forEach(item => {
    console.log(`- "${item.name}" (${item.category}, Stock: ${item.current_stock} ${item.unit})`);
  });
  
  // Check one store inventory
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name&limit=1',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  const store = stores[0];
  
  const inventoryOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/inventory_stock?select=item,stock_quantity,unit&store_id=eq.${store.id}`,
    method: 'GET',
    headers
  };
  
  const inventory = await makeRequest(inventoryOptions);
  const packagingInventory = inventory.filter(item => 
    item.item.toLowerCase().includes('take') ||
    item.item.toLowerCase().includes('box') ||
    item.item.toLowerCase().includes('rectangle') ||
    item.item.toLowerCase().includes('paper bag')
  );
  
  console.log(`\n🏪 STORE PACKAGING ITEMS (${store.name}):`);
  console.log('-'.repeat(50));
  packagingInventory.forEach(item => {
    console.log(`- "${item.item}" (Stock: ${item.stock_quantity} ${item.unit})`);
  });
  
  // Validation analysis
  console.log('\n🔍 DEPLOYMENT READINESS ANALYSIS:');
  console.log('-'.repeat(50));
  
  const deploymentIssues = [];
  const readyItems = [];
  
  uniqueIngredients.forEach(ingredient => {
    // Check exact match in commissary
    const commissaryMatch = packagingCommissary.find(item => item.name === ingredient);
    // Check exact match in store
    const storeMatch = packagingInventory.find(item => item.item === ingredient);
    
    if (commissaryMatch && storeMatch) {
      readyItems.push(ingredient);
      console.log(`✅ "${ingredient}" - Ready for deployment`);
    } else {
      deploymentIssues.push({
        ingredient,
        hasCommissary: !!commissaryMatch,
        hasStore: !!storeMatch
      });
      
      if (!commissaryMatch && !storeMatch) {
        console.log(`❌ "${ingredient}" - Missing from both commissary and store`);
      } else if (!commissaryMatch) {
        console.log(`⚠️  "${ingredient}" - Missing from commissary`);
      } else if (!storeMatch) {
        console.log(`⚠️  "${ingredient}" - Missing from store inventory`);
      }
    }
  });
  
  console.log('\n📊 DEPLOYMENT STATUS SUMMARY:');
  console.log('-'.repeat(50));
  console.log(`✅ Ready for deployment: ${readyItems.length}/${uniqueIngredients.length} items`);
  console.log(`❌ Blocking deployment: ${deploymentIssues.length}/${uniqueIngredients.length} items`);
  
  if (deploymentIssues.length === 0) {
    console.log('\n🎉 ALL PACKAGING ITEMS ARE READY FOR DEPLOYMENT!');
    console.log('🚀 You can now proceed with recipe deployment.');
  } else {
    console.log('\n🔧 REMAINING ISSUES TO FIX:');
    console.log('-'.repeat(30));
    
    deploymentIssues.forEach(issue => {
      console.log(`\n"${issue.ingredient}":`);
      if (!issue.hasCommissary) {
        console.log(`  - Add to commissary_inventory table`);
      }
      if (!issue.hasStore) {
        console.log(`  - Add to store inventory_stock tables`);
      }
      
      // Suggest similar items
      const similar = packagingCommissary.filter(item => {
        const itemWords = item.name.toLowerCase().split(' ');
        const ingredientWords = issue.ingredient.toLowerCase().split(' ');
        return itemWords.some(word => ingredientWords.includes(word));
      });
      
      if (similar.length > 0) {
        console.log(`  - OR update recipe to use: ${similar.map(s => `"${s.name}"`).join(', ')}`);
      }
    });
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('-'.repeat(30));
  if (deploymentIssues.length === 0) {
    console.log('1. ✅ All naming issues resolved');
    console.log('2. 🚀 Proceed with recipe deployment');
    console.log('3. 📊 Monitor deployment success');
  } else {
    console.log('1. 🔧 Fix remaining naming mismatches');
    console.log('2. 🔄 Re-run this verification script');
    console.log('3. 🚀 Deploy recipes once all issues resolved');
  }
}

finalVerification().catch(console.error);
