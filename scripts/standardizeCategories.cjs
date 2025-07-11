#!/usr/bin/env node

/**
 * Standardize Categories Script
 * 
 * This script standardizes category names and shows details of specific categories.
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

async function standardizeCategories() {
  console.log('🔧 Standardizing categories and checking "others"...\n');
  
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
  
  // Find recipes in "Add-ons" category
  const addOnsRecipes = allRecipes.filter(recipe => recipe.category_name === 'Add-ons');
  console.log(`🔍 Found ${addOnsRecipes.length} recipes in "Add-ons" category:`);
  addOnsRecipes.forEach(recipe => {
    console.log(`   - ${recipe.name} (ID: ${recipe.id}) - ₱${recipe.suggested_price || 0}`);
  });
  
  // Find recipes in "others" category
  const othersRecipes = allRecipes.filter(recipe => recipe.category_name === 'others');
  console.log(`\n🔍 Found ${othersRecipes.length} recipes in "others" category:`);
  othersRecipes.forEach(recipe => {
    console.log(`   - ${recipe.name} (ID: ${recipe.id}) - ₱${recipe.suggested_price || 0} - Type: ${recipe.recipe_type || 'null'}`);
  });
  
  // Update "Add-ons" to "addon"
  if (addOnsRecipes.length > 0) {
    console.log(`\n🔄 Updating ${addOnsRecipes.length} recipes from "Add-ons" to "addon"...`);
    
    for (const recipe of addOnsRecipes) {
      const updateOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/recipe_templates?id=eq.${recipe.id}`,
        method: 'PATCH',
        headers
      };
      
      try {
        await makeRequest(updateOptions, { category_name: 'addon' });
        console.log(`   ✅ Updated: ${recipe.name}`);
      } catch (error) {
        console.log(`   ❌ Failed to update ${recipe.name}: ${error.message}`);
      }
    }
  }
  
  // Show final category distribution
  console.log('\n📊 FINAL CATEGORY DISTRIBUTION:');
  const categoryGroups = {};
  
  // Re-fetch to get updated data
  const updatedRecipes = await makeRequest(templatesOptions);
  
  updatedRecipes.forEach(recipe => {
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
  
  console.log('\n✅ Category standardization complete!');
}

standardizeCategories().catch(console.error);
