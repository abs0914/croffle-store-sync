#!/usr/bin/env node

/**
 * Safe Clear Recipe Data
 * 
 * This script safely clears all recipe data while handling triggers properly
 * to avoid constraint violations.
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

async function runSQLCommand(sql) {
  const options = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/rpc/exec_sql',
    method: 'POST',
    headers
  };

  try {
    const result = await makeRequest(options, { query: sql });
    return result;
  } catch (error) {
    // Try alternative approach if exec_sql doesn't exist
    console.log('   Using alternative SQL execution method...');
    throw error;
  }
}

async function safeClearRecipeData() {
  console.log('\n🧹 Safely clearing recipe data...');
  
  try {
    // Step 1: Get current counts
    console.log('   📊 Getting current data counts...');
    
    const [templates, recipes, products] = await Promise.all([
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipe_templates?select=id&is_active=eq.true',
        method: 'GET',
        headers
      }),
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipes?select=id&is_active=eq.true',
        method: 'GET',
        headers
      }),
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/product_catalog?select=id&recipe_id=not.is.null',
        method: 'GET',
        headers
      })
    ]);
    
    console.log(`      Active Templates: ${templates.length}`);
    console.log(`      Active Recipes: ${recipes.length}`);
    console.log(`      Products with Recipes: ${products.length}`);
    
    // Step 2: Clear product catalog recipe references (one by one to avoid trigger issues)
    console.log('   🔗 Clearing product catalog recipe references...');
    let clearedProducts = 0;
    
    for (const product of products) {
      try {
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?id=eq.${product.id}`,
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        await makeRequest(updateOptions, { recipe_id: null });
        clearedProducts++;
        
        if (clearedProducts % 50 === 0) {
          console.log(`      Cleared ${clearedProducts}/${products.length} product references...`);
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        console.log(`      ⚠️ Failed to clear product ${product.id}: ${error.message}`);
      }
    }
    
    console.log(`      ✅ Cleared ${clearedProducts} product recipe references`);
    
    // Step 3: Deactivate recipes
    console.log('   📝 Deactivating recipes...');
    let deactivatedRecipes = 0;
    
    for (const recipe of recipes) {
      try {
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipes?id=eq.${recipe.id}`,
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        await makeRequest(updateOptions, { is_active: false });
        deactivatedRecipes++;
        
        if (deactivatedRecipes % 20 === 0) {
          console.log(`      Deactivated ${deactivatedRecipes}/${recipes.length} recipes...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        console.log(`      ⚠️ Failed to deactivate recipe ${recipe.id}: ${error.message}`);
      }
    }
    
    console.log(`      ✅ Deactivated ${deactivatedRecipes} recipes`);
    
    // Step 4: Deactivate recipe templates
    console.log('   📋 Deactivating recipe templates...');
    let deactivatedTemplates = 0;
    
    for (const template of templates) {
      try {
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_templates?id=eq.${template.id}`,
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        await makeRequest(updateOptions, { is_active: false });
        deactivatedTemplates++;
        
        if (deactivatedTemplates % 20 === 0) {
          console.log(`      Deactivated ${deactivatedTemplates}/${templates.length} templates...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        console.log(`      ⚠️ Failed to deactivate template ${template.id}: ${error.message}`);
      }
    }
    
    console.log(`      ✅ Deactivated ${deactivatedTemplates} templates`);
    
    return {
      templatesDeactivated: deactivatedTemplates,
      recipesDeactivated: deactivatedRecipes,
      productReferencesCleared: clearedProducts
    };
    
  } catch (error) {
    console.log(`   ❌ Error during clearing: ${error.message}`);
    throw error;
  }
}

async function verifyClearing() {
  console.log('\n🔍 Verifying data clearing...');
  
  try {
    const [activeTemplates, activeRecipes, linkedProducts] = await Promise.all([
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipe_templates?select=id&is_active=eq.true',
        method: 'GET',
        headers
      }),
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipes?select=id&is_active=eq.true',
        method: 'GET',
        headers
      }),
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/product_catalog?select=id&recipe_id=not.is.null',
        method: 'GET',
        headers
      })
    ]);
    
    console.log('   📊 VERIFICATION RESULTS:');
    console.log(`      Active Templates: ${activeTemplates.length} (should be 0)`);
    console.log(`      Active Recipes: ${activeRecipes.length} (should be 0)`);
    console.log(`      Products with Recipe Links: ${linkedProducts.length} (should be 0)`);
    
    const isClean = activeTemplates.length === 0 && activeRecipes.length === 0 && linkedProducts.length === 0;
    
    if (isClean) {
      console.log('   ✅ SUCCESS: All recipe data cleared successfully!');
    } else {
      console.log('   ⚠️ WARNING: Some data may not have been cleared completely');
    }
    
    return isClean;
    
  } catch (error) {
    console.log(`   ❌ Verification failed: ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🧹 SAFE RECIPE DATA CLEARING');
    console.log('='.repeat(50));
    console.log('This script safely clears all recipe data without constraint violations');
    console.log('');
    
    await authenticateAdmin();
    
    // Clear recipe data safely
    const result = await safeClearRecipeData();
    
    // Verify clearing
    const isClean = await verifyClearing();
    
    console.log('\n🎉 RECIPE DATA CLEARING COMPLETE!');
    console.log('='.repeat(50));
    console.log(`✅ Templates Deactivated: ${result.templatesDeactivated}`);
    console.log(`✅ Recipes Deactivated: ${result.recipesDeactivated}`);
    console.log(`✅ Product References Cleared: ${result.productReferencesCleared}`);
    
    if (isClean) {
      console.log('\n🚀 READY FOR FRESH IMPORT!');
      console.log('   The system is now clean and ready for a fresh recipe upload');
      console.log('   Categories are preserved, so your category structure remains intact');
      console.log('');
      console.log('📋 Next Steps:');
      console.log('   1. Go to Admin → Recipe Management in your application');
      console.log('   2. Click "Import Recipes" to use the Unified Recipe Import Dialog');
      console.log('   3. Upload your CSV file with exact category names');
      console.log('   4. The system will now use exact CSV values (no more mapping!)');
    } else {
      console.log('\n⚠️ PARTIAL CLEARING');
      console.log('   Some data may not have been cleared completely');
      console.log('   You may want to manually check and clear remaining data');
    }
    
  } catch (error) {
    console.error('❌ Clearing failed:', error.message);
    process.exit(1);
  }
}

main();
