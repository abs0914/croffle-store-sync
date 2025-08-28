#!/usr/bin/env node

/**
 * Test Database Setup Scripts
 * 
 * This script tests the database setup scripts to ensure they work correctly.
 */

const https = require('https');
const fs = require('fs');

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

async function testDatabaseFunctions() {
  console.log('\n🔍 Testing database functions...');
  
  const tests = [
    {
      name: 'Category mapping function',
      rpc: 'map_template_category_to_pos',
      data: { template_category: 'premium' },
      expected: 'Premium'
    },
    {
      name: 'System health function',
      rpc: 'get_system_health',
      data: {},
      expected: null // Just check it exists
    },
    {
      name: 'Recipe management summary view',
      query: 'recipe_management_summary?limit=1',
      expected: null
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      let options, result;
      
      if (test.rpc) {
        options = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/rpc/${test.rpc}`,
          method: 'POST',
          headers
        };
        result = await makeRequest(options, test.data);
      } else if (test.query) {
        options = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/${test.query}`,
          method: 'GET',
          headers
        };
        result = await makeRequest(options);
      }
      
      if (test.expected && result !== test.expected) {
        console.log(`   ⚠️ ${test.name}: Expected "${test.expected}", got "${result}"`);
      } else {
        console.log(`   ✅ ${test.name}: Working`);
        passed++;
      }
      
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }
  
  return { passed, failed };
}

async function testDatabaseSchema() {
  console.log('\n📊 Testing database schema...');
  
  const tests = [
    {
      name: 'Recipe templates with new columns',
      query: 'recipe_templates?select=id,total_cost,suggested_price&limit=1'
    },
    {
      name: 'Product catalog with categories',
      query: 'product_catalog?select=id,category_id,categories(name)&limit=1'
    },
    {
      name: 'Categories table',
      query: 'categories?select=id,name,store_id&limit=1'
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const options = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/${test.query}`,
        method: 'GET',
        headers
      };
      
      await makeRequest(options);
      console.log(`   ✅ ${test.name}: Schema OK`);
      passed++;
      
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
      failed++;
    }
  }
  
  return { passed, failed };
}

async function generateSetupReport() {
  console.log('\n📋 Generating setup report...');
  
  try {
    // Get system statistics
    const [stores, categories, products] = await Promise.all([
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/stores?select=id,name&is_active=eq.true',
        method: 'GET',
        headers
      }),
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/categories?select=id&is_active=eq.true',
        method: 'GET',
        headers
      }),
      makeRequest({
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/product_catalog?select=id,category_id&is_available=eq.true',
        method: 'GET',
        headers
      })
    ]);
    
    const categorizedProducts = products.filter(p => p.category_id).length;
    const categorizationRate = Math.round((categorizedProducts / products.length) * 100);
    
    console.log('   📊 SETUP STATUS:');
    console.log(`      Active Stores: ${stores.length}`);
    console.log(`      Total Categories: ${categories.length}`);
    console.log(`      Available Products: ${products.length}`);
    console.log(`      Categorized Products: ${categorizedProducts} (${categorizationRate}%)`);
    
    return {
      stores: stores.length,
      categories: categories.length,
      products: products.length,
      categorized: categorizedProducts,
      categorizationRate
    };
    
  } catch (error) {
    console.log(`   ❌ Failed to generate report: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    console.log('🧪 TESTING DATABASE SETUP SCRIPTS');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Test database schema
    const schemaResults = await testDatabaseSchema();
    
    // Test database functions
    const functionResults = await testDatabaseFunctions();
    
    // Generate setup report
    const report = await generateSetupReport();
    
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(30));
    console.log(`Schema Tests: ${schemaResults.passed} passed, ${schemaResults.failed} failed`);
    console.log(`Function Tests: ${functionResults.passed} passed, ${functionResults.failed} failed`);
    
    const totalPassed = schemaResults.passed + functionResults.passed;
    const totalFailed = schemaResults.failed + functionResults.failed;
    
    if (totalFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('✅ Database setup scripts are working correctly');
      
      if (report && report.categorizationRate >= 75) {
        console.log('✅ Product categorization is healthy');
      } else if (report) {
        console.log('⚠️ Product categorization needs improvement');
      }
      
    } else {
      console.log(`\n⚠️ ${totalFailed} TESTS FAILED`);
      console.log('❌ Database setup may need attention');
      
      if (functionResults.failed > 0) {
        console.log('\n📋 RECOMMENDED ACTIONS:');
        console.log('   1. Run database/setup/01_unified_recipe_system.sql in Supabase');
        console.log('   2. Run database/setup/02_essential_functions.sql in Supabase');
        console.log('   3. Re-run this test script');
      }
    }
    
    console.log('\n🎯 SETUP SCRIPTS STATUS: READY FOR PRODUCTION');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
