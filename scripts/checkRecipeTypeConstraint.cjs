#!/usr/bin/env node

/**
 * Check Recipe Type Constraint
 * 
 * This script checks what recipe_type values are allowed in the database.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

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

async function checkRecipeTypeConstraint() {
  console.log('🔍 CHECKING RECIPE TYPE CONSTRAINT');
  console.log('='.repeat(40));
  
  try {
    await authenticateAdmin();
    
    // Check existing recipes in Sugbo to see what recipe_type values work
    console.log('📋 CHECKING EXISTING RECIPES IN SUGBO MERCADO');
    console.log('-'.repeat(40));
    
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipes?select=*&store_id=eq.${SUGBO_STORE_ID}&limit=10`,
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    console.log(`✅ Found ${recipes.length} recipes in Sugbo Mercado`);
    
    const recipeTypes = new Set();
    recipes.forEach(recipe => {
      if (recipe.recipe_type) {
        recipeTypes.add(recipe.recipe_type);
      }
    });
    
    console.log('\n📊 Recipe types currently in use:');
    Array.from(recipeTypes).forEach(type => {
      console.log(`   - ${type}`);
    });
    
    // Check the Cookies & Cream recipe specifically
    const cookiesRecipe = recipes.find(r => r.name && r.name.toLowerCase().includes('cookies'));
    if (cookiesRecipe) {
      console.log(`\n🍪 Cookies & Cream recipe type: ${cookiesRecipe.recipe_type || 'null'}`);
    }
    
    // Test different recipe_type values
    console.log('\n🧪 TESTING RECIPE TYPE VALUES');
    console.log('-'.repeat(40));
    
    const testValues = ['regular', 'single', 'addon', 'combo', 'beverage', 'component'];
    
    for (const testType of testValues) {
      try {
        console.log(`Testing "${testType}"...`);
        
        const testOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/recipes',
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' }
        };
        
        const testData = {
          store_id: SUGBO_STORE_ID,
          name: `Test Recipe ${testType}`,
          description: 'Test recipe for constraint validation',
          suggested_price: 1,
          is_active: false,
          recipe_type: testType
        };
        
        const result = await makeRequest(testOptions, testData);
        console.log(`   ✅ "${testType}" - VALID`);
        
        // Clean up test recipe
        if (result && result[0] && result[0].id) {
          const deleteOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/recipes?id=eq.${result[0].id}`,
            method: 'DELETE',
            headers
          };
          
          await makeRequest(deleteOptions);
        }
        
      } catch (error) {
        if (error.message.includes('check constraint')) {
          console.log(`   ❌ "${testType}" - INVALID (constraint violation)`);
        } else {
          console.log(`   ⚠️ "${testType}" - ERROR: ${error.message}`);
        }
      }
    }
    
    console.log('\n📋 RECOMMENDATION:');
    console.log('Use the recipe_type value that works for existing recipes.');
    console.log('Most likely one of: regular, single, addon, combo, beverage');
    
  } catch (error) {
    console.error('❌ Error checking constraint:', error.message);
  }
}

// Run the check
checkRecipeTypeConstraint();
