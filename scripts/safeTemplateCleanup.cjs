#!/usr/bin/env node

/**
 * Safe Template Cleanup
 * 
 * This script safely clears all recipe templates and related data while avoiding
 * constraint violations by cleaning up in the correct order.
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

async function getDataCounts() {
  console.log('📊 Getting current data counts...');
  
  const counts = {};
  
  // Get counts for each table
  const tables = [
    'recipe_templates',
    'recipes', 
    'recipe_ingredients',
    'recipe_template_ingredients',
    'product_catalog',
    'products'
  ];
  
  for (const table of tables) {
    try {
      const options = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/${table}?select=count`,
        method: 'HEAD',
        headers
      };
      
      const response = await makeRequest(options);
      // Note: HEAD requests don't return body, we'll use a different approach
      
      // Use GET with limit 0 to get count from Content-Range header
      const countOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/${table}?select=id&limit=1`,
        method: 'GET',
        headers: { ...headers, 'Prefer': 'count=exact' }
      };
      
      // For now, let's get actual data to count
      const dataOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/${table}?select=id`,
        method: 'GET',
        headers
      };
      
      const data = await makeRequest(dataOptions);
      counts[table] = Array.isArray(data) ? data.length : 0;
      
    } catch (error) {
      console.log(`   ⚠️ Could not get count for ${table}: ${error.message}`);
      counts[table] = 'unknown';
    }
  }
  
  console.log('   Current counts:');
  Object.entries(counts).forEach(([table, count]) => {
    console.log(`     ${table}: ${count}`);
  });
  
  return counts;
}

async function safeCleanup() {
  console.log('\n🧹 Starting safe cleanup process...');
  
  const steps = [
    {
      name: 'Clear product catalog recipe references',
      table: 'product_catalog',
      action: 'update',
      data: { recipe_id: null },
      filter: 'recipe_id=not.is.null'
    },
    {
      name: 'Delete products with recipe references',
      table: 'products',
      action: 'delete',
      filter: 'recipe_id=not.is.null'
    },
    {
      name: 'Delete recipe ingredients',
      table: 'recipe_ingredients',
      action: 'delete',
      filter: 'id=neq.00000000-0000-0000-0000-000000000000'
    },
    {
      name: 'Delete recipes',
      table: 'recipes',
      action: 'delete',
      filter: 'template_id=not.is.null'
    },
    {
      name: 'Delete recipe template ingredients',
      table: 'recipe_template_ingredients',
      action: 'delete',
      filter: 'id=neq.00000000-0000-0000-0000-000000000000'
    },
    {
      name: 'Delete recipe templates',
      table: 'recipe_templates',
      action: 'delete',
      filter: 'id=neq.00000000-0000-0000-0000-000000000000'
    }
  ];
  
  let totalProcessed = 0;
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n   Step ${i + 1}: ${step.name}...`);
    
    try {
      const options = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/${step.table}?${step.filter}`,
        method: step.action === 'update' ? 'PATCH' : 'DELETE',
        headers: { ...headers, 'Prefer': 'return=minimal' }
      };
      
      const requestData = step.action === 'update' ? step.data : null;
      
      await makeRequest(options, requestData);
      console.log(`      ✅ ${step.name} completed`);
      totalProcessed++;
      
    } catch (error) {
      console.log(`      ❌ ${step.name} failed: ${error.message}`);
      
      // For some steps, failure might be expected (e.g., no data to delete)
      if (error.message.includes('404') || error.message.includes('No rows')) {
        console.log(`      ℹ️ No data found - this is expected`);
        totalProcessed++;
      } else {
        console.log(`      ⚠️ Continuing with next step...`);
      }
    }
    
    // Small delay between steps
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Cleanup completed: ${totalProcessed}/${steps.length} steps successful`);
  return totalProcessed === steps.length;
}

async function verifyCleanup() {
  console.log('\n🔍 Verifying cleanup results...');
  
  const finalCounts = await getDataCounts();
  
  const expectedZero = [
    'recipe_templates',
    'recipe_template_ingredients', 
    'recipe_ingredients'
  ];
  
  const shouldBeCleared = [
    'recipes' // Should have no recipes with template_id
  ];
  
  let allClear = true;
  
  expectedZero.forEach(table => {
    if (finalCounts[table] > 0) {
      console.log(`   ❌ ${table}: ${finalCounts[table]} (expected 0)`);
      allClear = false;
    } else {
      console.log(`   ✅ ${table}: ${finalCounts[table]}`);
    }
  });
  
  // Check for recipes with template_id
  try {
    const recipesWithTemplatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipes?select=id&template_id=not.is.null',
      method: 'GET',
      headers
    };
    
    const recipesWithTemplates = await makeRequest(recipesWithTemplatesOptions);
    const count = Array.isArray(recipesWithTemplates) ? recipesWithTemplates.length : 0;
    
    if (count > 0) {
      console.log(`   ❌ recipes with template_id: ${count} (expected 0)`);
      allClear = false;
    } else {
      console.log(`   ✅ recipes with template_id: ${count}`);
    }
  } catch (error) {
    console.log(`   ⚠️ Could not verify recipes: ${error.message}`);
  }
  
  return allClear;
}

async function main() {
  try {
    console.log('🚀 SAFE TEMPLATE CLEANUP');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Step 1: Get initial counts
    const initialCounts = await getDataCounts();
    
    // Step 2: Perform safe cleanup
    const cleanupSuccess = await safeCleanup();
    
    // Step 3: Verify results
    const verificationSuccess = await verifyCleanup();
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('='.repeat(50));
    console.log(`🔧 Cleanup successful: ${cleanupSuccess ? 'Yes' : 'Partial'}`);
    console.log(`✅ Verification passed: ${verificationSuccess ? 'Yes' : 'No'}`);
    
    if (cleanupSuccess && verificationSuccess) {
      console.log('\n🎯 SUCCESS: All recipe templates and related data cleared!');
      console.log('   You can now safely import new recipe templates.');
    } else {
      console.log('\n⚠️ Some issues may remain - check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

main();
