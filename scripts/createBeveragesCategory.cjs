#!/usr/bin/env node

/**
 * Create Beverages Category Script
 * 
 * This script creates a "beverages" category and moves drinks from "others" to it.
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

async function createBeveragesCategory() {
  console.log('🥤 Creating beverages category and moving drinks...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Get recipes in 'others' category
  console.log('📋 Finding recipes in "others" category...');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=id,name,category_name,suggested_price&category_name=eq.others',
    method: 'GET',
    headers
  };
  
  const othersRecipes = await makeRequest(templatesOptions);
  console.log(`✅ Found ${othersRecipes.length} recipes in "others" category:`);
  
  othersRecipes.forEach(recipe => {
    console.log(`   - ${recipe.name} (ID: ${recipe.id}) - ₱${recipe.suggested_price || 0}`);
  });
  
  // Update each recipe to 'beverages' category
  console.log(`\n🔄 Moving ${othersRecipes.length} recipes to "beverages" category...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const recipe of othersRecipes) {
    const updateOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_templates?id=eq.${recipe.id}`,
      method: 'PATCH',
      headers
    };
    
    try {
      await makeRequest(updateOptions, { category_name: 'beverages' });
      console.log(`   ✅ Moved: ${recipe.name}`);
      successCount++;
    } catch (error) {
      console.log(`   ❌ Failed to move ${recipe.name}: ${error.message}`);
      failCount++;
    }
  }
  
  console.log(`\n📊 RESULTS:`);
  console.log(`   Successfully moved: ${successCount} recipes`);
  console.log(`   Failed: ${failCount} recipes`);
  
  // Show final category distribution
  console.log('\n📋 Fetching updated category distribution...');
  const allTemplatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=category_name&order=category_name',
    method: 'GET',
    headers
  };
  
  const allRecipes = await makeRequest(allTemplatesOptions);
  
  const categoryGroups = {};
  allRecipes.forEach(recipe => {
    const category = recipe.category_name || '(no category)';
    if (!categoryGroups[category]) {
      categoryGroups[category] = 0;
    }
    categoryGroups[category]++;
  });
  
  console.log('\n📊 FINAL CATEGORY DISTRIBUTION:');
  Object.entries(categoryGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, count]) => {
      console.log(`   ${category}: ${count} recipes`);
    });
  
  console.log('\n✅ Beverages category created and recipes moved successfully! 🥤');
}

createBeveragesCategory().catch(console.error);
