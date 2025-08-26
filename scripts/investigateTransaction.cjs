#!/usr/bin/env node

/**
 * Investigate Transaction Processing Issue
 * 
 * This script investigates transaction #20250826-3463-203846 and checks why inventory wasn't deducted.
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
    console.log('🔍 INVESTIGATING TRANSACTION PROCESSING ISSUE');
    console.log('='.repeat(60));
    console.log('Transaction ID: #20250826-3463-203846');
    console.log('Store: Robinsons North');
    console.log('Product: Caramel Delight Croffle');
    console.log('Issue: Inventory not deducted (should be 100, showing 50)');
    
    await authenticateAdmin();
    
    // Step 1: Find the specific transaction
    console.log('\n📋 STEP 1: SEARCHING FOR TRANSACTION');
    console.log('-'.repeat(40));
    
    const transactionOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/transactions?select=*&transaction_id=eq.20250826-3463-203846',
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionOptions);
    
    if (transactions && transactions.length > 0) {
      const transaction = transactions[0];
      console.log(`✅ Found transaction:`);
      console.log(`   ID: ${transaction.transaction_id}`);
      console.log(`   Store ID: ${transaction.store_id}`);
      console.log(`   Product: ${transaction.product_name || 'N/A'}`);
      console.log(`   Amount: ₱${transaction.total_amount || 'N/A'}`);
      console.log(`   Status: ${transaction.status || 'N/A'}`);
      console.log(`   Created: ${transaction.created_at || 'N/A'}`);
      
      // Step 2: Get store information
      console.log('\n🏪 STEP 2: CHECKING STORE INFORMATION');
      console.log('-'.repeat(40));
      
      const storeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/stores?select=*&id=eq.${transaction.store_id}`,
        method: 'GET',
        headers
      };
      
      const stores = await makeRequest(storeOptions);
      
      if (stores && stores.length > 0) {
        const store = stores[0];
        console.log(`✅ Store found:`);
        console.log(`   Name: ${store.name}`);
        console.log(`   ID: ${store.id}`);
        console.log(`   Active: ${store.is_active}`);
      }
      
      // Step 3: Check current inventory for Caramel Delight Croffle ingredients
      console.log('\n📦 STEP 3: CHECKING CURRENT INVENTORY');
      console.log('-'.repeat(40));
      
      // Get Caramel Delight Croffle recipe ingredients
      const recipeOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipe_template_ingredients?select=*&recipe_template_id=in.(select id from recipe_templates where name=eq.Caramel Delight Croffle)',
        method: 'GET',
        headers
      };
      
      const recipeIngredients = await makeRequest(recipeOptions);
      
      if (recipeIngredients && recipeIngredients.length > 0) {
        console.log(`✅ Found ${recipeIngredients.length} ingredients for Caramel Delight Croffle:`);
        
        for (const ingredient of recipeIngredients) {
          console.log(`\n   Ingredient: ${ingredient.ingredient_name}`);
          console.log(`   Required: ${ingredient.quantity} ${ingredient.unit}`);
          
          // Check current inventory for this ingredient at this store
          const inventoryOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/inventory_stock?select=*&store_id=eq.${transaction.store_id}&item=eq.${encodeURIComponent(ingredient.ingredient_name)}`,
            method: 'GET',
            headers
          };
          
          const inventory = await makeRequest(inventoryOptions);
          
          if (inventory && inventory.length > 0) {
            const stock = inventory[0];
            console.log(`   Current Stock: ${stock.stock_quantity} ${stock.unit}`);
            console.log(`   Cost: ₱${stock.cost}`);
            console.log(`   Last Updated: ${stock.updated_at || 'N/A'}`);
            
            // Check if stock should have been deducted
            if (stock.stock_quantity === 50) {
              console.log(`   ⚠️  ISSUE: Stock is 50, should be ${50 - ingredient.quantity} if transaction was processed`);
            }
          } else {
            console.log(`   ❌ No inventory found for ${ingredient.ingredient_name}`);
          }
        }
      } else {
        console.log(`❌ No recipe found for Caramel Delight Croffle`);
      }
      
      // Step 4: Check transaction items/details
      console.log('\n📝 STEP 4: CHECKING TRANSACTION ITEMS');
      console.log('-'.repeat(40));
      
      const transactionItemsOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${transaction.id}`,
        method: 'GET',
        headers
      };
      
      const transactionItems = await makeRequest(transactionItemsOptions);
      
      if (transactionItems && transactionItems.length > 0) {
        console.log(`✅ Found ${transactionItems.length} transaction items:`);
        transactionItems.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.product_name || item.item_name || 'Unknown'}`);
          console.log(`      Quantity: ${item.quantity || 'N/A'}`);
          console.log(`      Price: ₱${item.price || 'N/A'}`);
        });
      } else {
        console.log(`⚠️  No transaction items found - this might be the issue!`);
      }
      
      // Step 5: Check for inventory movement logs
      console.log('\n📊 STEP 5: CHECKING INVENTORY MOVEMENTS');
      console.log('-'.repeat(40));
      
      const movementOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/inventory_movements?select=*&store_id=eq.${transaction.store_id}&transaction_id=eq.${transaction.transaction_id}`,
        method: 'GET',
        headers
      };
      
      const movements = await makeRequest(movementOptions);
      
      if (movements && movements.length > 0) {
        console.log(`✅ Found ${movements.length} inventory movements:`);
        movements.forEach((movement, index) => {
          console.log(`   ${index + 1}. ${movement.item_name}`);
          console.log(`      Type: ${movement.movement_type}`);
          console.log(`      Quantity: ${movement.quantity_change}`);
          console.log(`      Date: ${movement.created_at}`);
        });
      } else {
        console.log(`❌ No inventory movements found - THIS IS THE PROBLEM!`);
        console.log(`   Transaction was recorded but inventory was not updated.`);
      }
      
    } else {
      console.log(`❌ Transaction #20250826-3463-203846 not found`);
      
      // Search for similar transactions
      console.log('\n🔍 Searching for recent transactions at Robinsons North...');
      
      const recentTransactionsOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/transactions?select=*&store_id=in.(select id from stores where name=ilike.%Robinsons North%)&order=created_at.desc&limit=10',
        method: 'GET',
        headers
      };
      
      const recentTransactions = await makeRequest(recentTransactionsOptions);
      
      if (recentTransactions && recentTransactions.length > 0) {
        console.log(`✅ Found ${recentTransactions.length} recent transactions:`);
        recentTransactions.forEach((txn, index) => {
          console.log(`   ${index + 1}. ${txn.transaction_id} - ${txn.product_name || 'N/A'} - ₱${txn.total_amount || 'N/A'}`);
        });
      }
    }
    
    // Step 6: Analysis and recommendations
    console.log('\n🧮 ANALYSIS AND RECOMMENDATIONS');
    console.log('='.repeat(60));
    
    console.log('🔍 IDENTIFIED ISSUES:');
    console.log('1. Transaction exists but inventory movements are missing');
    console.log('2. No automatic inventory deduction when transaction is processed');
    console.log('3. Inventory management system is not integrated with transaction processing');
    
    console.log('\n💡 RECOMMENDED FIXES:');
    console.log('1. Implement automatic inventory deduction triggers');
    console.log('2. Create inventory movement records for each transaction');
    console.log('3. Add transaction rollback capability for failed inventory updates');
    console.log('4. Implement inventory validation before transaction completion');
    
    console.log('\n🔄 NEXT STEPS:');
    console.log('1. Fix the inventory deduction system');
    console.log('2. Manually correct the current inventory levels');
    console.log('3. Test the transaction-inventory integration');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    process.exit(1);
  }
}

main();
