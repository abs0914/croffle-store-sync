#!/usr/bin/env node

/**
 * Deploy Recipe Templates from Sugbo Mercado to New Stores
 * 
 * This script deploys all recipe templates and their associated data from 
 * "Sugbo Mercado (IT Park, Cebu)" to two new stores: "SM City Cebu" and "SM Savemore Tacloban"
 * 
 * Usage: node scripts/deployRecipesToNewStores.cjs
 */

const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// Store names
const SOURCE_STORE_NAME = 'Sugbo Mercado (IT Park, Cebu)';
const TARGET_STORES = [
  'SM City Cebu',
  'SM Savemore Tacloban'
];

let authToken = null;

// Headers for API requests
const getHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  ...(authToken && { 'Authorization': `Bearer ${authToken}` })
});

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

// Authenticate as admin
async function authenticateAdmin() {
  console.log('🔐 Authenticating as admin...');
  
  const authOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };

  const authData = {
    email: 'admin@example.com',
    password: 'password123'
  };

  try {
    const response = await makeRequest(authOptions, authData);
    authToken = response.access_token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

// Find store by name
async function findStoreByName(storeName) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/stores?select=*&name=eq.${encodeURIComponent(storeName)}`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const stores = await makeRequest(options);
    return stores.length > 0 ? stores[0] : null;
  } catch (error) {
    console.error(`Error finding store "${storeName}":`, error.message);
    return null;
  }
}

// Get all recipe templates
async function getAllRecipeTemplates() {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/recipe_templates?select=*&is_active=eq.true&order=name',
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const templates = await makeRequest(options);
    return templates || [];
  } catch (error) {
    console.error('Error fetching recipe templates:', error.message);
    return [];
  }
}

// Get recipe template ingredients
async function getRecipeTemplateIngredients(templateId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_template_ingredients?select=*&recipe_template_id=eq.${templateId}&order=display_order,ingredient_name`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const ingredients = await makeRequest(options);
    return ingredients || [];
  } catch (error) {
    console.error(`Error fetching ingredients for template ${templateId}:`, error.message);
    return [];
  }
}

// Get store inventory for ingredient mapping
async function getStoreInventory(storeId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${storeId}&is_active=eq.true`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const inventory = await makeRequest(options);
    return inventory || [];
  } catch (error) {
    console.error(`Error fetching inventory for store ${storeId}:`, error.message);
    return [];
  }
}

// Check if recipe already exists in target store
async function checkExistingRecipe(storeId, templateId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipes?select=id&store_id=eq.${storeId}&template_id=eq.${templateId}`,
    method: 'GET',
    headers: getHeaders()
  };

  try {
    const existing = await makeRequest(options);
    return existing.length > 0;
  } catch (error) {
    console.error(`Error checking existing recipe:`, error.message);
    return false;
  }
}

// Create ingredient mapping for target store
function createIngredientMapping(ingredients, targetInventory) {
  const inventoryMap = new Map();
  targetInventory.forEach(item => {
    inventoryMap.set(item.item.toLowerCase(), item);
  });

  const mappedIngredients = [];
  const unmappedIngredients = [];

  ingredients.forEach(ingredient => {
    const ingredientName = ingredient.ingredient_name.toLowerCase();
    const inventoryItem = inventoryMap.get(ingredientName);

    if (inventoryItem) {
      mappedIngredients.push({
        ...ingredient,
        inventory_stock_id: inventoryItem.id,
        store_unit: inventoryItem.unit,
        mapped_to: inventoryItem.item
      });
    } else {
      // Try partial matching
      let found = false;
      for (const [key, item] of inventoryMap) {
        if (key.includes(ingredientName) || ingredientName.includes(key)) {
          mappedIngredients.push({
            ...ingredient,
            inventory_stock_id: item.id,
            store_unit: item.unit,
            mapped_to: item.item,
            mapping_type: 'partial'
          });
          found = true;
          break;
        }
      }
      
      if (!found) {
        unmappedIngredients.push(ingredient);
      }
    }
  });

  return { mappedIngredients, unmappedIngredients };
}

// Deploy recipe to target store
async function deployRecipeToStore(template, ingredients, targetStore, targetInventory) {
  console.log(`\n📦 Deploying "${template.name}" to ${targetStore.name}...`);

  // Check if recipe already exists
  const exists = await checkExistingRecipe(targetStore.id, template.id);
  if (exists) {
    console.log(`   ⚠️  Recipe "${template.name}" already exists in ${targetStore.name}`);
    return { success: true, skipped: true, reason: 'already_exists' };
  }

  // Map ingredients to target store inventory
  const { mappedIngredients, unmappedIngredients } = createIngredientMapping(ingredients, targetInventory);

  if (unmappedIngredients.length > 0) {
    console.log(`   ⚠️  ${unmappedIngredients.length} ingredients could not be mapped:`);
    unmappedIngredients.slice(0, 3).forEach(ing => {
      console.log(`      - ${ing.ingredient_name}`);
    });
    if (unmappedIngredients.length > 3) {
      console.log(`      ... and ${unmappedIngredients.length - 3} more`);
    }
  }

  // Calculate total cost from mapped ingredients
  const totalCost = mappedIngredients.reduce((sum, ing) => {
    return sum + (ing.quantity * (ing.cost_per_unit || 0));
  }, 0);

  // Create recipe
  const recipeOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/recipes',
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Prefer': 'return=representation'
    }
  };

  const recipeData = {
    template_id: template.id,
    store_id: targetStore.id,
    name: template.name,
    description: template.description || '',
    instructions: template.instructions || '',
    yield_quantity: template.yield_quantity || 1,
    serving_size: template.serving_size || 1,
    total_cost: totalCost,
    cost_per_serving: totalCost / (template.yield_quantity || 1),
    suggested_price: template.suggested_price || 0,
    is_active: true,
    approval_status: 'approved',
    sku: `${template.id.slice(0, 8)}-${targetStore.id.slice(0, 8)}`
  };

  try {
    const recipe = await makeRequest(recipeOptions, recipeData);
    const recipeId = Array.isArray(recipe) ? recipe[0].id : recipe.id;

    // Create recipe ingredients
    if (mappedIngredients.length > 0) {
      const ingredientOptions = {
        hostname: SUPABASE_URL,
        port: 443,
        path: '/rest/v1/recipe_ingredients',
        method: 'POST',
        headers: getHeaders()
      };

      const recipeIngredients = mappedIngredients.map(ing => ({
        recipe_id: recipeId,
        inventory_stock_id: ing.inventory_stock_id,
        quantity: ing.quantity,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit || 0,
        notes: ing.mapping_type === 'partial' ? `Partial match: ${ing.mapped_to}` : null
      }));

      try {
        await makeRequest(ingredientOptions, recipeIngredients);
      } catch (error) {
        console.log(`   ⚠️  Failed to create recipe ingredients: ${error.message}`);
      }
    }

    // Create deployment record
    try {
      const deploymentOptions = {
        hostname: SUPABASE_URL,
        port: 443,
        path: '/rest/v1/recipe_deployments',
        method: 'POST',
        headers: getHeaders()
      };

      const deploymentData = {
        template_id: template.id,
        store_id: targetStore.id,
        recipe_id: recipeId,
        deployed_by: template.created_by || null,
        cost_snapshot: totalCost,
        price_snapshot: template.suggested_price || 0,
        deployment_notes: `Auto-deployed via script - ${mappedIngredients.length}/${ingredients.length} ingredients mapped`
      };

      await makeRequest(deploymentOptions, deploymentData);
    } catch (error) {
      console.log(`   ⚠️  Failed to create deployment record: ${error.message}`);
    }

    console.log(`   ✅ Successfully deployed "${template.name}"`);
    console.log(`      - Recipe ID: ${recipeId}`);
    console.log(`      - Mapped ingredients: ${mappedIngredients.length}/${ingredients.length}`);
    console.log(`      - Total cost: ₱${totalCost.toFixed(2)}`);

    return {
      success: true,
      recipeId,
      mappedIngredients: mappedIngredients.length,
      totalIngredients: ingredients.length,
      unmappedIngredients: unmappedIngredients.length,
      totalCost
    };

  } catch (error) {
    console.log(`   ❌ Failed to deploy "${template.name}": ${error.message}`);
    return {
      success: false,
      error: error.message,
      unmappedIngredients: unmappedIngredients.length
    };
  }
}

// Main execution function
async function main() {
  console.log('🚀 Starting recipe deployment process...\n');

  // Step 1: Authenticate
  const authenticated = await authenticateAdmin();
  if (!authenticated) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Find source store
  console.log(`\n🔍 Finding source store: ${SOURCE_STORE_NAME}`);
  const sourceStore = await findStoreByName(SOURCE_STORE_NAME);

  if (!sourceStore) {
    console.log(`❌ Source store "${SOURCE_STORE_NAME}" not found`);
    return;
  }

  console.log(`✅ Found source store: ${sourceStore.name} (ID: ${sourceStore.id})`);

  // Step 3: Get all recipe templates
  console.log('\n📋 Fetching recipe templates...');
  const templates = await getAllRecipeTemplates();

  if (templates.length === 0) {
    console.log('❌ No recipe templates found');
    return;
  }

  console.log(`✅ Found ${templates.length} recipe templates`);

  // Group templates by category
  const templatesByCategory = {};
  templates.forEach(template => {
    const category = template.category_name || 'Other';
    if (!templatesByCategory[category]) {
      templatesByCategory[category] = [];
    }
    templatesByCategory[category].push(template);
  });

  console.log('\n📊 Templates by category:');
  Object.entries(templatesByCategory).forEach(([category, temps]) => {
    console.log(`   - ${category}: ${temps.length} templates`);
  });

  // Step 4: Process target stores
  const deploymentResults = [];

  for (const targetStoreName of TARGET_STORES) {
    console.log(`\n🏪 Processing target store: ${targetStoreName}`);
    console.log('='.repeat(50));

    const targetStore = await findStoreByName(targetStoreName);

    if (!targetStore) {
      console.log(`   ❌ Target store "${targetStoreName}" not found`);
      deploymentResults.push({
        store: targetStoreName,
        success: false,
        error: 'Store not found'
      });
      continue;
    }

    console.log(`   ✅ Found store: ${targetStore.name} (ID: ${targetStore.id})`);

    // Get target store inventory for ingredient mapping
    console.log(`   📦 Loading inventory for ingredient mapping...`);
    const targetInventory = await getStoreInventory(targetStore.id);
    console.log(`   ✅ Loaded ${targetInventory.length} inventory items`);

    if (targetInventory.length === 0) {
      console.log(`   ❌ No inventory found in ${targetStoreName} - cannot map ingredients`);
      deploymentResults.push({
        store: targetStoreName,
        storeId: targetStore.id,
        success: false,
        error: 'No inventory found for ingredient mapping'
      });
      continue;
    }

    // Deploy each template
    let deployedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const categoryResults = {};

    for (const template of templates) {
      // Get template ingredients
      const ingredients = await getRecipeTemplateIngredients(template.id);

      const result = await deployRecipeToStore(template, ingredients, targetStore, targetInventory);

      if (result.success) {
        if (result.skipped) {
          skippedCount++;
        } else {
          deployedCount++;
        }
      } else {
        failedCount++;
      }

      // Track by category
      const category = template.category_name || 'Other';
      if (!categoryResults[category]) {
        categoryResults[category] = { deployed: 0, skipped: 0, failed: 0 };
      }

      if (result.success) {
        if (result.skipped) {
          categoryResults[category].skipped++;
        } else {
          categoryResults[category].deployed++;
        }
      } else {
        categoryResults[category].failed++;
      }

      // Small delay between deployments
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Deployment summary for ${targetStoreName}:`);
    console.log(`   ✅ Deployed: ${deployedCount} recipes`);
    console.log(`   ⚠️  Skipped: ${skippedCount} recipes (already existed)`);
    console.log(`   ❌ Failed: ${failedCount} recipes`);

    console.log('\n📋 Results by category:');
    Object.entries(categoryResults).forEach(([category, results]) => {
      const total = results.deployed + results.skipped + results.failed;
      console.log(`   ${category}: ${results.deployed}/${total} deployed (${results.skipped} skipped, ${results.failed} failed)`);
    });

    deploymentResults.push({
      store: targetStoreName,
      storeId: targetStore.id,
      success: true,
      deployed: deployedCount,
      skipped: skippedCount,
      failed: failedCount,
      total: templates.length,
      categoryResults
    });
  }

  // Step 5: Final Summary
  console.log('\n📊 DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Recipe Templates: ${templates.length}`);
  console.log('');

  let totalDeployed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  deploymentResults.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.store}:`);
      console.log(`   - Deployed: ${result.deployed} recipes`);
      console.log(`   - Skipped: ${result.skipped} recipes`);
      console.log(`   - Failed: ${result.failed} recipes`);
      console.log(`   - Success rate: ${((result.deployed / result.total) * 100).toFixed(1)}%`);
      
      totalDeployed += result.deployed;
      totalSkipped += result.skipped;
      totalFailed += result.failed;
    } else {
      console.log(`❌ ${result.store}: ${result.error}`);
    }
  });

  console.log('');
  console.log(`📈 Overall Results:`);
  console.log(`   - Total Deployed: ${totalDeployed} recipes`);
  console.log(`   - Total Skipped: ${totalSkipped} recipes`);
  console.log(`   - Total Failed: ${totalFailed} recipes`);

  const successfulStores = deploymentResults.filter(r => r.success).length;
  console.log(`\n🎉 Successfully processed ${successfulStores}/${TARGET_STORES.length} target stores`);

  if (successfulStores === TARGET_STORES.length && totalFailed === 0) {
    console.log('\n✅ Recipe deployment completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Verify recipe deployments using verification script');
    console.log('   2. Test POS system with deployed recipes');
    console.log('   3. Check ingredient mappings and costs');
  } else {
    console.log('\n⚠️  Some recipes had issues. Check the logs above for details.');
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Script failed:', error.message);
  process.exit(1);
});
