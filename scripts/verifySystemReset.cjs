#!/usr/bin/env node

/**
 * System Reset Verification Script
 * 
 * This script verifies that the complete system reset was successful
 * and the system is ready for fresh recipe data upload.
 */

const https = require('https');

// Supabase configuration
const SUPABASE_URL = 'https://bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

/**
 * Make HTTP request to Supabase
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Check table count
 */
async function checkTableCount(tableName, expectedCount = 0) {
  const options = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/${tableName}?select=id`,
    method: 'HEAD',
    headers: {
      ...headers,
      'Prefer': 'count=exact'
    }
  };

  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const count = parseInt(res.headers['content-range']?.split('/')[1] || '0');
        resolve({ count, status: res.statusCode });
      });
      req.on('error', reject);
      req.end();
    });

    const status = response.count === expectedCount ? '✅' : '❌';
    const message = response.count === expectedCount ? 'PASS' : 'FAIL';
    
    console.log(`${status} ${tableName}: ${response.count} records (expected: ${expectedCount}) - ${message}`);
    
    return {
      table: tableName,
      count: response.count,
      expected: expectedCount,
      passed: response.count === expectedCount
    };
  } catch (error) {
    console.log(`❌ ${tableName}: Error checking count - ${error.message}`);
    return {
      table: tableName,
      count: -1,
      expected: expectedCount,
      passed: false,
      error: error.message
    };
  }
}

/**
 * Verify system reset completion
 */
async function verifySystemReset() {
  console.log('🔍 Verifying Complete System Reset...\n');
  console.log('=====================================\n');

  const checks = [];

  // Tables that should be empty after reset
  console.log('📋 Checking tables that should be empty:');
  console.log('----------------------------------------');
  
  const emptyTables = [
    'recipe_templates',
    'recipes', 
    'recipe_ingredients',
    'recipe_template_ingredients',
    'inventory_stock',
    'inventory_items',
    'commissary_inventory',
    'product_catalog',
    'product_ingredients',
    'recipe_deployments',
    'recipe_ingredient_mappings',
    'standardized_ingredients'
  ];

  for (const table of emptyTables) {
    const result = await checkTableCount(table, 0);
    checks.push(result);
    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
  }

  console.log('\n📋 Checking tables that should be preserved:');
  console.log('--------------------------------------------');

  // Tables that should have data (preserved)
  const preservedTables = [
    { name: 'stores', minExpected: 1 },
    { name: 'app_users', minExpected: 1 }
  ];

  for (const table of preservedTables) {
    const result = await checkTableCount(table.name);
    const passed = result.count >= table.minExpected;
    const status = passed ? '✅' : '❌';
    const message = passed ? 'PASS' : 'FAIL';

    console.log(`${status} ${table.name}: ${result.count} records (min expected: ${table.minExpected}) - ${message}`);

    checks.push({
      table: `${table.name}_preserved`,
      count: result.count,
      expected: table.minExpected,
      passed: passed
    });

    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
  }

  // Check for reset log entry
  console.log('\n📋 Checking reset completion log:');
  console.log('----------------------------------');
  
  try {
    const logOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/system_reset_log?select=*&reset_type=eq.COMPLETE_RECIPE_INVENTORY_RESET&order=reset_date.desc&limit=1',
      method: 'GET',
      headers
    };

    const logResult = await makeRequest(logOptions);
    
    if (logResult && logResult.length > 0) {
      const resetEntry = logResult[0];
      console.log('✅ Reset log found:');
      console.log(`   Reset Date: ${resetEntry.reset_date}`);
      console.log(`   Reset Type: ${resetEntry.reset_type}`);
      console.log(`   Created By: ${resetEntry.created_by}`);
    } else {
      console.log('❌ No reset log entry found - migration may not have completed');
    }
  } catch (error) {
    console.log(`❌ Error checking reset log: ${error.message}`);
  }

  // Summary
  console.log('\n📊 VERIFICATION SUMMARY');
  console.log('=======================');
  
  const totalChecks = checks.length;
  const passedChecks = checks.filter(c => c.passed).length;
  const failedChecks = totalChecks - passedChecks;
  
  console.log(`Total checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${failedChecks}`);
  
  if (failedChecks > 0) {
    console.log('\n❌ SYSTEM RESET VERIFICATION FAILED');
    console.log('===================================');
    console.log('The following checks failed:');
    
    checks.filter(c => !c.passed).forEach(check => {
      console.log(`- ${check.table}: ${check.count} records (expected: ${check.expected})`);
    });
    
    console.log('\nRecommendations:');
    console.log('1. Review the reset migration logs');
    console.log('2. Check for foreign key constraint issues');
    console.log('3. Manually verify problematic tables');
    console.log('4. Re-run the reset migration if necessary');
    
    process.exit(1);
  } else {
    console.log('\n✅ SYSTEM RESET VERIFICATION SUCCESSFUL');
    console.log('=======================================');
    console.log('🎉 The system has been successfully reset!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Upload fresh master recipe data (61 products)');
    console.log('2. Deploy recipes to all active stores');
    console.log('3. Verify product catalog generation');
    console.log('4. Test POS integration');
    console.log('');
    console.log('The system is ready for fresh recipe management deployment.');
    
    process.exit(0);
  }
}

// Run verification
verifySystemReset().catch(error => {
  console.error('❌ Verification failed with error:', error);
  process.exit(1);
});
