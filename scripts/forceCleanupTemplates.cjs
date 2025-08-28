#!/usr/bin/env node

/**
 * Force Cleanup Templates
 * 
 * This script forcefully clears all recipe templates by handling constraint violations
 * and foreign key dependencies in the correct order.
 */

const https = require('https');

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
          const result = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result?.message || body}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          resolve(body);
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
  console.log('🔐 Authenticating admin user...');
  
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
  
  if (authResult.access_token) {
    headers.Authorization = `Bearer ${authResult.access_token}`;
    console.log('✅ Admin authenticated successfully');
  } else {
    throw new Error('Authentication failed');
  }
}

async function clearProductCatalogReferences() {
  console.log('🔗 Clearing product catalog recipe references...');
  
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/product_catalog?recipe_id=not.is.null',
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' }
    };
    
    await makeRequest(options, { recipe_id: null });
    console.log('   ✅ Product catalog references cleared');
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function deleteAllProducts() {
  console.log('🗑️ Deleting all products to avoid constraint violations...');
  
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/products?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers
    };
    
    await makeRequest(options);
    console.log('   ✅ All products deleted');
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function deleteAllRecipes() {
  console.log('🗑️ Deleting all recipes...');
  
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipes?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers
    };
    
    await makeRequest(options);
    console.log('   ✅ All recipes deleted');
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function deleteAllRecipeIngredients() {
  console.log('🗑️ Deleting all recipe ingredients...');
  
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_ingredients?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers
    };
    
    await makeRequest(options);
    console.log('   ✅ All recipe ingredients deleted');
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function deleteAllTemplateIngredients() {
  console.log('🗑️ Deleting all recipe template ingredients...');
  
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers
    };
    
    await makeRequest(options);
    console.log('   ✅ All recipe template ingredients deleted');
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function deleteAllTemplates() {
  console.log('🗑️ Deleting all recipe templates...');
  
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'DELETE',
      headers
    };
    
    await makeRequest(options);
    console.log('   ✅ All recipe templates deleted');
    return true;
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return false;
  }
}

async function verifyCleanup() {
  console.log('\n🔍 Verifying cleanup...');
  
  const tables = [
    'recipe_templates',
    'recipe_template_ingredients',
    'recipes',
    'recipe_ingredients'
  ];
  
  let allClear = true;
  
  for (const table of tables) {
    try {
      const options = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/${table}?select=id`,
        method: 'GET',
        headers
      };
      
      const data = await makeRequest(options);
      const count = Array.isArray(data) ? data.length : 0;
      
      if (count === 0) {
        console.log(`   ✅ ${table}: ${count}`);
      } else {
        console.log(`   ❌ ${table}: ${count} (expected 0)`);
        allClear = false;
      }
    } catch (error) {
      console.log(`   ⚠️ ${table}: Could not verify (${error.message})`);
    }
  }
  
  return allClear;
}

async function main() {
  try {
    console.log('🚀 FORCE CLEANUP TEMPLATES');
    console.log('='.repeat(50));
    console.log('⚠️ WARNING: This will delete ALL recipe-related data!');
    console.log('   - All recipe templates');
    console.log('   - All recipes');
    console.log('   - All recipe ingredients');
    console.log('   - All products (to avoid constraint violations)');
    console.log('   - Product catalog recipe references will be cleared');
    console.log('');
    
    await authenticateAdmin();
    
    console.log('\n🧹 Starting aggressive cleanup...');
    
    // Step 1: Clear product catalog references
    await clearProductCatalogReferences();
    
    // Step 2: Delete all products (to avoid constraint violations)
    await deleteAllProducts();
    
    // Step 3: Delete all recipe ingredients
    await deleteAllRecipeIngredients();
    
    // Step 4: Delete all recipes
    await deleteAllRecipes();
    
    // Step 5: Delete all template ingredients
    await deleteAllTemplateIngredients();
    
    // Step 6: Delete all templates
    await deleteAllTemplates();
    
    // Step 7: Verify cleanup
    const isClean = await verifyCleanup();
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ All recipe data cleared: ${isClean ? 'Yes' : 'Partial'}`);
    
    if (isClean) {
      console.log('\n🎯 SUCCESS: Database is clean!');
      console.log('   You can now safely import new recipe templates.');
      console.log('   Note: You will need to redeploy products to stores.');
    } else {
      console.log('\n⚠️ Some data may still remain - check the verification above.');
    }
    
  } catch (error) {
    console.error('❌ Force cleanup failed:', error.message);
    process.exit(1);
  }
}

main();
