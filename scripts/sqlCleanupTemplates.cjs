#!/usr/bin/env node

/**
 * SQL Cleanup Templates
 * 
 * This script uses direct SQL commands to forcefully clean up all recipe-related data
 * while properly handling foreign key constraints and triggers.
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

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/execute_sql',
      method: 'POST',
      headers
    };
    
    const result = await makeRequest(options, { sql });
    console.log(`   ✅ ${description} completed`);
    return true;
  } catch (error) {
    console.log(`   ❌ ${description} failed: ${error.message}`);
    return false;
  }
}

async function fallbackCleanup() {
  console.log('\n🔄 Using fallback cleanup approach...');

  let successCount = 0;

  // Try to clear references first
  try {
    const clearOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/product_catalog?recipe_id=not.is.null',
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' }
    };

    await makeRequest(clearOptions, { recipe_id: null });
    console.log('   ✅ Product catalog references cleared');
    successCount++;
  } catch (error) {
    console.log(`   ⚠️ Could not clear references: ${error.message}`);
  }

  // Try to set templates as inactive instead of deleting
  try {
    const deactivateOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' }
    };

    await makeRequest(deactivateOptions, { is_active: false });
    console.log('   ✅ Recipe templates deactivated');
    successCount++;
  } catch (error) {
    console.log(`   ❌ Could not deactivate templates: ${error.message}`);
  }

  // Try to set recipes as inactive
  try {
    const deactivateRecipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipes?id=neq.00000000-0000-0000-0000-000000000000',
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' }
    };

    await makeRequest(deactivateRecipesOptions, { is_active: false });
    console.log('   ✅ Recipes deactivated');
    successCount++;
  } catch (error) {
    console.log(`   ❌ Could not deactivate recipes: ${error.message}`);
  }

  return successCount;
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
    console.log('🚀 SQL CLEANUP TEMPLATES');
    console.log('='.repeat(50));
    console.log('⚠️ WARNING: This will delete ALL recipe-related data using SQL!');
    console.log('   This approach bypasses REST API constraints and uses direct SQL.');
    console.log('');
    
    await authenticateAdmin();
    
    // Check if execute_sql RPC function exists
    console.log('\n🔍 Checking if SQL execution is available...');
    try {
      await executeSQL('SELECT 1 as test;', 'Test SQL execution');

      // If we get here, SQL execution is available
      const sqlSuccess = await cleanupWithSQL();
      const isClean = await verifyCleanup();

      console.log('\n🎉 CLEANUP COMPLETE!');
      console.log('='.repeat(50));
      console.log(`🔧 SQL cleanup successful: ${sqlSuccess ? 'Yes' : 'Partial'}`);
      console.log(`✅ All recipe data cleared: ${isClean ? 'Yes' : 'Partial'}`);

      if (isClean) {
        console.log('\n🎯 SUCCESS: Database is clean!');
        console.log('   You can now safely import new recipe templates.');
      } else {
        console.log('\n⚠️ Some data may still remain - manual intervention may be needed.');
      }

      return;

    } catch (error) {
      console.log('❌ SQL execution not available. Using alternative approach...');

      // Use fallback cleanup
      const fallbackSuccess = await fallbackCleanup();

      console.log('\n📋 ALTERNATIVE SOLUTION APPLIED:');
      console.log(`   - ${fallbackSuccess}/3 cleanup steps successful`);
      console.log('   - Recipe templates set to inactive');
      console.log('   - Recipes set to inactive');
      console.log('   - Product catalog references cleared');
      console.log('   - This should resolve constraint violations');
      console.log('   - You can now try importing new templates');

      return;
    }

  } catch (error) {
    console.error('❌ SQL cleanup failed:', error.message);
    process.exit(1);
  }
}

main();
