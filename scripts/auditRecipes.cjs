#!/usr/bin/env node

/**
 * Recipe Audit Script
 * 
 * This script performs a comprehensive audit of all recipes to check:
 * - Complete ingredient information
 * - Proper costs and prices
 * - Duplicate recipes
 * - Data quality issues
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
  
  return {
    accessToken: result.access_token,
    userId: result.user.id
  };
}

async function auditRecipes() {
  console.log('🔍 Starting comprehensive recipe audit...\n');
  
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
  
  // Analyze each recipe
  const auditResults = {
    complete: [],
    incomplete: [],
    duplicates: [],
    issues: []
  };
  
  const nameGroups = {};
  
  for (const template of templates) {
    // Group by name to detect duplicates
    if (!nameGroups[template.name]) {
      nameGroups[template.name] = [];
    }
    nameGroups[template.name].push(template);
    
    // Get ingredients for this recipe
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_template_ingredients?recipe_template_id=eq.${template.id}&select=id,ingredient_name,quantity,unit,cost_per_unit,commissary_item_id`,
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    
    // Analyze recipe completeness
    const analysis = {
      id: template.id,
      name: template.name,
      category: template.category_name,
      price: template.suggested_price,
      isActive: template.is_active,
      ingredientCount: ingredients.length,
      ingredients: ingredients,
      issues: [],
      isComplete: true
    };
    
    // Check for issues
    if (ingredients.length === 0) {
      analysis.issues.push('No ingredients');
      analysis.isComplete = false;
    }
    
    if (!template.suggested_price || template.suggested_price === 0) {
      analysis.issues.push('No price set');
      analysis.isComplete = false;
    }
    
    if (!template.category_name) {
      analysis.issues.push('No category');
      analysis.isComplete = false;
    }
    
    // Check ingredient issues
    ingredients.forEach((ing, index) => {
      if (!ing.ingredient_name) {
        analysis.issues.push(`Ingredient ${index + 1}: Missing name`);
        analysis.isComplete = false;
      }
      if (!ing.quantity || ing.quantity <= 0) {
        analysis.issues.push(`Ingredient ${index + 1}: Invalid quantity`);
        analysis.isComplete = false;
      }
      if (!ing.unit) {
        analysis.issues.push(`Ingredient ${index + 1}: Missing unit`);
        analysis.isComplete = false;
      }
      if (ing.cost_per_unit === null || ing.cost_per_unit === undefined) {
        analysis.issues.push(`Ingredient ${index + 1}: Missing cost`);
        analysis.isComplete = false;
      }
      if (!ing.commissary_item_id) {
        analysis.issues.push(`Ingredient ${index + 1}: Not linked to commissary`);
        analysis.isComplete = false;
      }
    });
    
    // Categorize recipe
    if (analysis.isComplete) {
      auditResults.complete.push(analysis);
    } else {
      auditResults.incomplete.push(analysis);
    }
    
    if (analysis.issues.length > 0) {
      auditResults.issues.push(analysis);
    }
  }
  
  // Identify duplicates
  for (const [name, recipes] of Object.entries(nameGroups)) {
    if (recipes.length > 1) {
      auditResults.duplicates.push({
        name,
        count: recipes.length,
        recipes: recipes.map(r => ({
          id: r.id,
          price: r.suggested_price,
          category: r.category_name,
          isActive: r.is_active,
          created: r.created_at
        }))
      });
    }
  }
  
  // Display results
  console.log('📊 AUDIT RESULTS:\n');
  
  // Complete recipes
  console.log(`✅ COMPLETE RECIPES (${auditResults.complete.length}):`);
  auditResults.complete.forEach(recipe => {
    console.log(`   • ${recipe.name} (${recipe.category}) - ₱${recipe.price} - ${recipe.ingredientCount} ingredients`);
  });
  
  // Incomplete recipes
  console.log(`\n❌ INCOMPLETE RECIPES (${auditResults.incomplete.length}):`);
  auditResults.incomplete.forEach(recipe => {
    console.log(`   • ${recipe.name} (${recipe.category || 'No category'}) - ₱${recipe.price || 0}`);
    recipe.issues.forEach(issue => {
      console.log(`     - ${issue}`);
    });
  });
  
  // Duplicates
  console.log(`\n🔄 DUPLICATE RECIPES (${auditResults.duplicates.length} sets):`);
  auditResults.duplicates.forEach(duplicate => {
    console.log(`   • ${duplicate.name} (${duplicate.count} copies):`);
    duplicate.recipes.forEach((recipe, index) => {
      console.log(`     ${index + 1}. ID: ${recipe.id} - ₱${recipe.price} - ${recipe.category} - ${recipe.isActive ? 'Active' : 'Inactive'}`);
    });
  });
  
  // Summary statistics
  console.log('\n📈 SUMMARY STATISTICS:');
  console.log(`   Total recipes: ${templates.length}`);
  console.log(`   Complete recipes: ${auditResults.complete.length}`);
  console.log(`   Incomplete recipes: ${auditResults.incomplete.length}`);
  console.log(`   Duplicate recipe sets: ${auditResults.duplicates.length}`);
  console.log(`   Recipes with issues: ${auditResults.issues.length}`);
  
  // Calculate completion percentage
  const completionRate = ((auditResults.complete.length / templates.length) * 100).toFixed(1);
  console.log(`   Completion rate: ${completionRate}%`);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (auditResults.incomplete.length > 0) {
    console.log('   1. Run smartUpload.cjs to fix incomplete recipes');
  }
  
  if (auditResults.duplicates.length > 0) {
    console.log('   2. Clean up duplicate recipes:');
    auditResults.duplicates.forEach(duplicate => {
      const bestRecipe = duplicate.recipes.reduce((best, current) => {
        // Prefer active recipes with proper prices
        if (current.isActive && current.price > 0 && (!best.isActive || best.price === 0)) {
          return current;
        }
        return best;
      }, duplicate.recipes[0]);
      
      const toDelete = duplicate.recipes.filter(r => r.id !== bestRecipe.id);
      console.log(`      - Keep: ${duplicate.name} (ID: ${bestRecipe.id}, ₱${bestRecipe.price})`);
      toDelete.forEach(recipe => {
        console.log(`      - Delete: ID ${recipe.id} (₱${recipe.price})`);
      });
    });
  }
  
  if (auditResults.complete.length === templates.length) {
    console.log('   🎉 All recipes are complete! No action needed.');
  }
  
  // Specific check for Mango recipe
  console.log('\n🥭 MANGO RECIPE STATUS:');
  const mangoRecipes = nameGroups['Mango'] || [];
  if (mangoRecipes.length === 0) {
    console.log('   ❌ Mango recipe not found');
  } else if (mangoRecipes.length > 1) {
    console.log(`   ⚠️  Found ${mangoRecipes.length} Mango recipes (duplicates)`);
    mangoRecipes.forEach((recipe, index) => {
      const analysis = auditResults.complete.find(r => r.id === recipe.id) || 
                      auditResults.incomplete.find(r => r.id === recipe.id);
      console.log(`      ${index + 1}. ₱${recipe.suggested_price} - ${analysis?.ingredientCount || 0} ingredients - ${analysis?.isComplete ? 'Complete' : 'Incomplete'}`);
    });
  } else {
    const mangoRecipe = mangoRecipes[0];
    const analysis = auditResults.complete.find(r => r.id === mangoRecipe.id) || 
                    auditResults.incomplete.find(r => r.id === mangoRecipe.id);
    if (analysis?.isComplete) {
      console.log(`   ✅ Mango recipe is complete - ₱${mangoRecipe.suggested_price} - ${analysis.ingredientCount} ingredients`);
      analysis.ingredients.forEach(ing => {
        console.log(`      - ${ing.ingredient_name}: ${ing.quantity} ${ing.unit} @ ₱${ing.cost_per_unit}`);
      });
    } else {
      console.log(`   ❌ Mango recipe is incomplete - ${analysis?.issues.join(', ')}`);
    }
  }
  
  return auditResults;
}

auditRecipes().catch(console.error);
