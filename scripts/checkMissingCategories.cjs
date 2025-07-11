#!/usr/bin/env node

/**
 * Check Missing Categories Script
 * 
 * This script identifies recipe templates that are missing category information.
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

async function checkMissingCategories() {
  console.log('🔍 Checking for recipes without categories...\n');
  
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
    path: '/rest/v1/recipe_templates?select=id,name,category_name,recipe_type,suggested_price,is_active&order=name',
    method: 'GET',
    headers
  };
  
  const allRecipes = await makeRequest(templatesOptions);
  console.log(`✅ Total recipes found: ${allRecipes.length}\n`);
  
  // Filter recipes with no category
  const noCategoryRecipes = allRecipes.filter(recipe => 
    !recipe.category_name || recipe.category_name === null || recipe.category_name.trim() === ''
  );
  
  console.log(`🚫 Recipes without category: ${noCategoryRecipes.length}\n`);
  
  if (noCategoryRecipes.length > 0) {
    console.log('📝 RECIPES WITHOUT CATEGORY:');
    noCategoryRecipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. ${recipe.name}`);
      console.log(`      ID: ${recipe.id}`);
      console.log(`      Recipe Type: ${recipe.recipe_type || 'null'}`);
      console.log(`      Price: ₱${recipe.suggested_price || 0}`);
      console.log(`      Active: ${recipe.is_active ? 'Yes' : 'No'}`);
      console.log('');
    });
  } else {
    console.log('✅ All recipes have categories assigned!');
  }
  
  // Also show category distribution
  console.log('\n📊 CATEGORY DISTRIBUTION:');
  const categoryGroups = {};
  allRecipes.forEach(recipe => {
    const category = recipe.category_name || '(no category)';
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(recipe);
  });
  
  Object.entries(categoryGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, recipes]) => {
      console.log(`   ${category}: ${recipes.length} recipes`);
    });
}

checkMissingCategories().catch(console.error);
