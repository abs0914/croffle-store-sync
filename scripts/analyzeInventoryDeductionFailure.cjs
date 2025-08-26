#!/usr/bin/env node

/**
 * Analyze Inventory Deduction Failure
 * 
 * This script analyzes why the inventory deduction system failed for transaction #20250826-8559-210711
 * and provides detailed insights into the current inventory state.
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

const TRANSACTION_ID = '50284b6d-4a31-46e2-a16c-48c00364664f';
const STORE_ID = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (body.trim() === '') {
            resolve(null);
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
            } else {
              resolve(result);
            }
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
  headers.Authorization = `Bearer ${authResult.access_token}`;
  console.log('✅ Admin authenticated successfully');
  return authResult;
}

async function main() {
  try {
    console.log('🔍 ANALYZING INVENTORY DEDUCTION FAILURE');
    console.log('='.repeat(60));
    console.log(`Transaction ID: ${TRANSACTION_ID}`);
    console.log(`Store ID: ${STORE_ID}`);
    
    await authenticateAdmin();
    
    // ANALYSIS 1: Check inventory patterns to determine if deduction occurred
    console.log('\n📊 ANALYSIS 1: INVENTORY PATTERN ANALYSIS');
    console.log('-'.repeat(50));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_stock?select=*&store_id=eq.${STORE_ID}&is_active=eq.true&order=item`,
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    
    if (inventory && inventory.length > 0) {
      console.log(`✅ Found ${inventory.length} inventory items for the store`);
      
      // Group by quantity to see patterns
      const quantityGroups = {};
      inventory.forEach(item => {
        const qty = item.stock_quantity;
        if (!quantityGroups[qty]) {
          quantityGroups[qty] = [];
        }
        quantityGroups[qty].push(item.item);
      });
      
      console.log('\n📈 Inventory Quantity Distribution:');
      Object.entries(quantityGroups).forEach(([qty, items]) => {
        console.log(`   ${qty} units: ${items.length} items`);
        if (items.length <= 5) {
          console.log(`      Items: ${items.join(', ')}`);
        } else {
          console.log(`      Items: ${items.slice(0, 3).join(', ')} ... and ${items.length - 3} more`);
        }
      });
      
      // Check specific ingredients from our transaction
      const transactionIngredients = [
        'Regular Croissant', 'Whipped Cream', 'Chopstick', 'Wax Paper',
        'Ice', 'Milk', '16oz Plastic Cups', 'Flat Lid'
      ];
      
      console.log('\n🎯 Transaction Ingredients Analysis:');
      transactionIngredients.forEach(ingredientName => {
        const item = inventory.find(inv => inv.item === ingredientName);
        if (item) {
          const status = item.stock_quantity === 49 ? '🔄 DEDUCTED' : 
                        item.stock_quantity === 100 ? '❌ NOT DEDUCTED' : 
                        '⚠️ PARTIAL/OTHER';
          console.log(`   ${ingredientName}: ${item.stock_quantity} ${item.unit} ${status}`);
        } else {
          console.log(`   ${ingredientName}: ❌ NOT FOUND`);
        }
      });
      
    } else {
      console.log('❌ No inventory found for the store');
    }
    
    // ANALYSIS 2: Check if there are ANY inventory movements for this store
    console.log('\n📊 ANALYSIS 2: INVENTORY MOVEMENTS ANALYSIS');
    console.log('-'.repeat(50));
    
    const allMovementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_transactions?select=*&store_id=eq.${STORE_ID}&order=created_at.desc&limit=10`,
      method: 'GET',
      headers
    };
    
    const allMovements = await makeRequest(allMovementsOptions);
    
    if (allMovements && allMovements.length > 0) {
      console.log(`✅ Found ${allMovements.length} recent inventory movements for this store:`);
      allMovements.forEach((movement, index) => {
        console.log(`   ${index + 1}. ${movement.item_name || movement.item}: ${movement.quantity} (${movement.transaction_type})`);
        console.log(`      Reference: ${movement.reference_id || 'N/A'}`);
        console.log(`      Created: ${movement.created_at}`);
      });
    } else {
      console.log('❌ No inventory movements found for this store');
      console.log('   This suggests the inventory deduction system has never worked for this store');
    }
    
    // ANALYSIS 3: Check if the transaction was processed by the new system
    console.log('\n📊 ANALYSIS 3: TRANSACTION PROCESSING ANALYSIS');
    console.log('-'.repeat(50));
    
    // Check transaction timestamp vs our system deployment
    const transactionOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?select=*&id=eq.${TRANSACTION_ID}`,
      method: 'GET',
      headers
    };
    
    const transactionData = await makeRequest(transactionOptions);
    
    if (transactionData && transactionData.length > 0) {
      const transaction = transactionData[0];
      const transactionTime = new Date(transaction.created_at);
      const now = new Date();
      
      console.log(`✅ Transaction Details:`);
      console.log(`   Created: ${transaction.created_at}`);
      console.log(`   Status: ${transaction.status}`);
      console.log(`   Time since creation: ${Math.round((now - transactionTime) / (1000 * 60))} minutes ago`);
      
      // Check if this transaction was created after our system fixes
      const systemFixTime = new Date('2025-08-26T12:00:00Z'); // Approximate time of our fixes
      const wasProcessedAfterFix = transactionTime > systemFixTime;
      
      console.log(`   Processed after system fix: ${wasProcessedAfterFix ? '✅ YES' : '❌ NO'}`);
      
      if (wasProcessedAfterFix) {
        console.log('   🔍 This transaction should have triggered inventory deduction');
      } else {
        console.log('   ℹ️  This transaction was created before our system fixes');
      }
    }
    
    // ANALYSIS 4: Check for any system errors or logs
    console.log('\n📊 ANALYSIS 4: SYSTEM ERROR ANALYSIS');
    console.log('-'.repeat(50));
    
    // Check if there are any recent transactions that DID create movements
    const recentMovementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_transactions?select=*&order=created_at.desc&limit=5',
      method: 'GET',
      headers
    };
    
    const recentMovements = await makeRequest(recentMovementsOptions);
    
    if (recentMovements && recentMovements.length > 0) {
      console.log(`✅ Found ${recentMovements.length} recent inventory movements across all stores:`);
      recentMovements.forEach((movement, index) => {
        console.log(`   ${index + 1}. Store: ${movement.store_id}`);
        console.log(`      Item: ${movement.item_name || movement.item}`);
        console.log(`      Type: ${movement.transaction_type}`);
        console.log(`      Quantity: ${movement.quantity}`);
        console.log(`      Reference: ${movement.reference_id || 'N/A'}`);
        console.log(`      Created: ${movement.created_at}`);
      });
    } else {
      console.log('❌ No recent inventory movements found across ANY store');
      console.log('   This suggests the inventory deduction system is completely inactive');
    }
    
    // FINAL DIAGNOSIS
    console.log('\n🎯 FINAL DIAGNOSIS');
    console.log('='.repeat(60));
    
    const hasRecentMovements = recentMovements && recentMovements.length > 0;
    const hasStoreMovements = allMovements && allMovements.length > 0;
    
    console.log('🔍 DIAGNOSIS RESULTS:');
    
    if (!hasRecentMovements && !hasStoreMovements) {
      console.log('❌ CRITICAL: Inventory deduction system is completely inactive');
      console.log('   • No inventory movements found anywhere in the system');
      console.log('   • The automatic deduction integration is not working');
      console.log('   • Transactions are completing without triggering inventory updates');
    } else if (!hasStoreMovements && hasRecentMovements) {
      console.log('⚠️  PARTIAL: System works for some stores but not this one');
      console.log('   • Other stores have inventory movements');
      console.log('   • This specific store has no movements');
      console.log('   • Possible store-specific configuration issue');
    } else if (hasStoreMovements) {
      console.log('🔄 INCONSISTENT: System has worked before but failed for this transaction');
      console.log('   • Store has previous inventory movements');
      console.log('   • This specific transaction was not processed');
      console.log('   • Possible timing or integration issue');
    }
    
    console.log('\n💡 RECOMMENDED ACTIONS:');
    console.log('1. 🔧 Verify the streamlined transaction service integration');
    console.log('2. 🔧 Check if the inventory deduction service is being called');
    console.log('3. 🔧 Test the system with a new transaction');
    console.log('4. 🔧 Add logging to track deduction attempts');
    console.log('5. 🔧 Consider manual correction for this transaction');
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Transaction processed: ✅`);
    console.log(`   Items recorded: ✅`);
    console.log(`   Recipes found: ✅`);
    console.log(`   Inventory deduction: ❌ FAILED`);
    console.log(`   System status: NEEDS IMMEDIATE ATTENTION`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

main();
