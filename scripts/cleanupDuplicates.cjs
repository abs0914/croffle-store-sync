#!/usr/bin/env node

/**
 * Cleanup Duplicates Script
 * 
 * This script removes duplicate recipes, keeping the best version of each.
 * Priority: Active recipes with proper prices > Active recipes with ₱0 > Inactive recipes
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
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
    
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function authenticate() {
  console.log('🔐 Authenticating...');
  
  const options = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const result = await makeRequest(options, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  console.log('✅ Authentication successful');
  return {
    accessToken: result.access_token,
    userId: result.user.id
  };
}

function scoreRecipe(recipe) {
  let score = 0;
  
  // Prefer active recipes
  if (recipe.is_active) score += 100;
  
  // Prefer recipes with proper prices
  if (recipe.suggested_price > 0) score += 50;
  
  // Prefer main categories over addon
  if (recipe.category_name !== 'addon') score += 25;
  
  // Prefer higher prices (indicates more complete recipe)
  score += recipe.suggested_price || 0;
  
  return score;
}

async function cleanupDuplicates() {
  console.log('🧹 Starting duplicate cleanup...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Get all recipe templates
  console.log('📋 Fetching all recipe templates...');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name,suggested_price,is_active,created_at&order=name',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  console.log(`✅ Found ${templates.length} recipe templates\n`);
  
  // Group by name to find duplicates
  const nameGroups = {};
  templates.forEach(template => {
    if (!nameGroups[template.name]) {
      nameGroups[template.name] = [];
    }
    nameGroups[template.name].push(template);
  });
  
  // Find duplicates
  const duplicates = Object.entries(nameGroups).filter(([name, recipes]) => recipes.length > 1);
  
  console.log(`🔄 Found ${duplicates.length} recipe names with duplicates\n`);
  
  let deletedCount = 0;
  let keptCount = 0;
  
  for (const [recipeName, recipes] of duplicates) {
    console.log(`\n📋 Processing: ${recipeName} (${recipes.length} copies)`);
    
    // Score each recipe to determine the best one
    const scoredRecipes = recipes.map(recipe => ({
      ...recipe,
      score: scoreRecipe(recipe)
    })).sort((a, b) => b.score - a.score);
    
    const bestRecipe = scoredRecipes[0];
    const toDelete = scoredRecipes.slice(1);
    
    console.log(`   ✅ Keep: ID ${bestRecipe.id} - ₱${bestRecipe.suggested_price} - ${bestRecipe.category_name} - Score: ${bestRecipe.score}`);
    keptCount++;
    
    // Delete the duplicates
    for (const recipe of toDelete) {
      try {
        console.log(`   🗑️  Delete: ID ${recipe.id} - ₱${recipe.suggested_price} - ${recipe.category_name} - Score: ${recipe.score}`);

        // First, check if there are any recipes referencing this template
        const checkReferencesOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipes?select=id,name,store_id&template_id=eq.${recipe.id}`,
          method: 'GET',
          headers
        };

        const referencingRecipes = await makeRequest(checkReferencesOptions);

        if (referencingRecipes && referencingRecipes.length > 0) {
          console.log(`      🔄 Found ${referencingRecipes.length} recipes referencing this template. Updating references...`);

          // Update all referencing recipes to point to the kept template
          const updateReferencesOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/recipes?template_id=eq.${recipe.id}`,
            method: 'PATCH',
            headers
          };

          await makeRequest(updateReferencesOptions, { template_id: bestRecipe.id });
          console.log(`      ✅ Updated ${referencingRecipes.length} recipe references`);
        }

        // Check and update recipe_deployments references
        const checkDeploymentsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_deployments?select=id&template_id=eq.${recipe.id}`,
          method: 'GET',
          headers
        };

        const referencingDeployments = await makeRequest(checkDeploymentsOptions);

        if (referencingDeployments && referencingDeployments.length > 0) {
          console.log(`      🔄 Found ${referencingDeployments.length} deployments referencing this template. Updating references...`);

          const updateDeploymentsOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/recipe_deployments?template_id=eq.${recipe.id}`,
            method: 'PATCH',
            headers
          };

          await makeRequest(updateDeploymentsOptions, { template_id: bestRecipe.id });
          console.log(`      ✅ Updated ${referencingDeployments.length} deployment references`);
        }

        // Check and update recipe_deployment_logs references
        const checkDeploymentLogsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_deployment_logs?select=id&template_id=eq.${recipe.id}`,
          method: 'GET',
          headers
        };

        const referencingLogs = await makeRequest(checkDeploymentLogsOptions);

        if (referencingLogs && referencingLogs.length > 0) {
          console.log(`      🔄 Found ${referencingLogs.length} deployment logs referencing this template. Updating references...`);

          const updateLogsOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/recipe_deployment_logs?template_id=eq.${recipe.id}`,
            method: 'PATCH',
            headers
          };

          await makeRequest(updateLogsOptions, { template_id: bestRecipe.id });
          console.log(`      ✅ Updated ${referencingLogs.length} deployment log references`);
        }

        // Delete ingredients first
        const deleteIngredientsOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_template_ingredients?recipe_template_id=eq.${recipe.id}`,
          method: 'DELETE',
          headers
        };

        await makeRequest(deleteIngredientsOptions);

        // Then delete the recipe template
        const deleteRecipeOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_templates?id=eq.${recipe.id}`,
          method: 'DELETE',
          headers
        };

        await makeRequest(deleteRecipeOptions);
        deletedCount++;
        console.log(`      ✅ Deleted successfully`);

      } catch (error) {
        console.log(`      ❌ Failed to delete: ${error.message}`);
      }
    }
  }
  
  console.log('\n📊 CLEANUP RESULTS:');
  console.log(`   Duplicate recipe sets processed: ${duplicates.length}`);
  console.log(`   Recipes kept: ${keptCount}`);
  console.log(`   Recipes deleted: ${deletedCount}`);
  console.log(`   Estimated remaining recipes: ${templates.length - deletedCount}`);
  
  console.log('\n🎉 Duplicate cleanup complete!');
  console.log('💡 Run the audit script again to verify the cleanup.');
  
  // Show specific status for key recipes
  console.log('\n🔍 KEY RECIPE STATUS:');
  const keyRecipes = ['Mango', 'Tiramisu', 'Americano (Hot)', 'Coke'];
  
  for (const recipeName of keyRecipes) {
    const recipeGroup = nameGroups[recipeName];
    if (recipeGroup) {
      if (recipeGroup.length > 1) {
        const best = recipeGroup.reduce((best, current) => 
          scoreRecipe(current) > scoreRecipe(best) ? current : best
        );
        console.log(`   ${recipeName}: ✅ Kept best version (₱${best.suggested_price})`);
      } else {
        console.log(`   ${recipeName}: ✅ No duplicates found`);
      }
    } else {
      console.log(`   ${recipeName}: ❌ Not found`);
    }
  }
}

cleanupDuplicates().catch(console.error);
