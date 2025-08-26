#!/usr/bin/env node

/**
 * Final Recipe Audit Script
 * 
 * This script audits recipes without checking commissary linking
 * since ingredients will be synced with store inventory during deployment.
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

async function finalAudit() {
  console.log('🔍 Starting final recipe audit...');
  console.log('📝 Note: Commissary linking is ignored (will sync during deployment)\n');
  
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
    path: '/rest/v1/recipe_templates?select=id,name,category_name,suggested_price,is_active&order=name',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  console.log(`✅ Found ${templates.length} recipe templates\n`);
  
  // Analyze each recipe
  const auditResults = {
    complete: [],
    incomplete: [],
    duplicates: []
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
      path: `/rest/v1/recipe_template_ingredients?recipe_template_id=eq.${template.id}&select=id,ingredient_name,quantity,unit,cost_per_unit`,
      method: 'GET',
      headers
    };
    
    const ingredients = await makeRequest(ingredientsOptions);
    
    // Analyze recipe completeness (without commissary linking)
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
    
    // Check for issues (excluding commissary linking)
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
    
    // Check ingredient issues (excluding commissary linking)
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
    });
    
    // Categorize recipe
    if (analysis.isComplete) {
      auditResults.complete.push(analysis);
    } else {
      auditResults.incomplete.push(analysis);
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
          isActive: r.is_active
        }))
      });
    }
  }
  
  // Display results
  console.log('📊 FINAL AUDIT RESULTS:\n');
  
  // Complete recipes by category
  const completeByCategory = {};
  auditResults.complete.forEach(recipe => {
    if (!completeByCategory[recipe.category]) {
      completeByCategory[recipe.category] = [];
    }
    completeByCategory[recipe.category].push(recipe);
  });
  
  console.log(`✅ COMPLETE RECIPES (${auditResults.complete.length}):`);
  Object.entries(completeByCategory).forEach(([category, recipes]) => {
    console.log(`\n   📂 ${category.toUpperCase()} (${recipes.length}):`);
    recipes.forEach(recipe => {
      console.log(`      • ${recipe.name} - ₱${recipe.price} - ${recipe.ingredientCount} ingredients`);
    });
  });
  
  // Incomplete recipes
  if (auditResults.incomplete.length > 0) {
    console.log(`\n❌ INCOMPLETE RECIPES (${auditResults.incomplete.length}):`);
    auditResults.incomplete.forEach(recipe => {
      console.log(`   • ${recipe.name} (${recipe.category || 'No category'}) - ₱${recipe.price || 0}`);
      recipe.issues.forEach(issue => {
        console.log(`     - ${issue}`);
      });
    });
  }
  
  // Duplicates
  if (auditResults.duplicates.length > 0) {
    console.log(`\n🔄 DUPLICATE RECIPES (${auditResults.duplicates.length} sets):`);
    auditResults.duplicates.forEach(duplicate => {
      console.log(`   • ${duplicate.name} (${duplicate.count} copies)`);
    });
  }
  
  // Summary statistics
  console.log('\n📈 SUMMARY:');
  console.log(`   Total recipes: ${templates.length}`);
  console.log(`   Complete recipes: ${auditResults.complete.length}`);
  console.log(`   Incomplete recipes: ${auditResults.incomplete.length}`);
  console.log(`   Duplicate recipe sets: ${auditResults.duplicates.length}`);
  
  // Calculate completion percentage
  const completionRate = ((auditResults.complete.length / templates.length) * 100).toFixed(1);
  console.log(`   Completion rate: ${completionRate}%`);
  
  // Specific check for key recipes
  console.log('\n🎯 KEY RECIPE STATUS:');
  const keyRecipes = ['Mango', 'Tiramisu', 'Americano (Hot)', 'Cappuccino (Hot)', 'Coke'];
  
  keyRecipes.forEach(recipeName => {
    const recipe = auditResults.complete.find(r => r.name === recipeName) || 
                   auditResults.incomplete.find(r => r.name === recipeName);
    
    if (recipe) {
      if (recipe.isComplete) {
        console.log(`   ✅ ${recipeName}: Complete - ₱${recipe.price} - ${recipe.ingredientCount} ingredients`);
      } else {
        console.log(`   ❌ ${recipeName}: Incomplete - ${recipe.issues.join(', ')}`);
      }
    } else {
      console.log(`   ❓ ${recipeName}: Not found`);
    }
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (auditResults.duplicates.length > 0) {
    console.log('   1. Run cleanupDuplicates.cjs to remove duplicate recipes');
  }
  
  if (auditResults.incomplete.length > 0) {
    console.log('   2. Fix incomplete recipes (missing prices, ingredients, or categories)');
  }
  
  if (auditResults.complete.length === templates.length && auditResults.duplicates.length === 0) {
    console.log('   🎉 All recipes are complete and unique! Ready for deployment.');
  }
  
  return auditResults;
}

finalAudit().catch(console.error);
