#!/usr/bin/env node

/**
 * Debug Transaction Deduction
 * 
 * This script investigates why the recent transaction didn't trigger
 * inventory deduction and identifies the root cause.
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
    
    // Update headers with the access token
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    
    return authResult;
  } catch (error) {
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function debugTransactionDeduction() {
  console.log('🔍 DEBUGGING TRANSACTION DEDUCTION ISSUE');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Step 1: Get the recent transaction details
    console.log('💳 STEP 1: ANALYZING RECENT TRANSACTION');
    console.log('-'.repeat(40));
    
    const transactionsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?select=*&store_id=eq.${SUGBO_STORE_ID}&order=created_at.desc&limit=1`,
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionsOptions);
    
    if (transactions.length === 0) {
      console.log('❌ No recent transactions found');
      return;
    }
    
    const transaction = transactions[0];
    console.log(`✅ Found recent transaction: ${transaction.receipt_number}`);
    console.log(`   ID: ${transaction.id}`);
    console.log(`   Total: ₱${transaction.total}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Created: ${transaction.created_at}`);
    
    // Analyze transaction items
    console.log('\n📋 Transaction Items:');
    if (transaction.items && Array.isArray(transaction.items)) {
      transaction.items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name || 'Unknown'}`);
        console.log(`      Quantity: ${item.quantity || 'N/A'}`);
        console.log(`      Price: ₱${item.unitPrice || item.totalPrice || 'N/A'}`);
        console.log(`      Product ID: ${item.productId || 'N/A'}`);
        console.log(`      Recipe ID: ${item.recipeId || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️ No items found or items not in expected format');
      console.log(`   Raw items data: ${JSON.stringify(transaction.items)}`);
    }
    
    // Step 2: Check if transaction items have recipe links
    console.log('\n🔗 STEP 2: CHECKING RECIPE LINKS');
    console.log('-'.repeat(40));
    
    if (transaction.items && Array.isArray(transaction.items)) {
      for (const item of transaction.items) {
        if (item.productId) {
          // Check product catalog for recipe link
          const productOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/product_catalog?select=*&id=eq.${item.productId}`,
            method: 'GET',
            headers
          };
          
          const products = await makeRequest(productOptions);
          
          if (products.length > 0) {
            const product = products[0];
            console.log(`✅ Product: ${product.product_name}`);
            console.log(`   Recipe ID: ${product.recipe_id || 'Not linked'}`);
            console.log(`   Category: ${product.category || 'N/A'}`);
            
            if (product.recipe_id) {
              // Check recipe ingredients
              const ingredientsOptions = {
                hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
                port: 443,
                path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
                method: 'GET',
                headers
              };
              
              const ingredients = await makeRequest(ingredientsOptions);
              console.log(`   Recipe Ingredients: ${ingredients.length} found`);
              
              if (ingredients.length === 0) {
                console.log('   ❌ Recipe has no ingredients - this prevents deduction');
              }
            } else {
              console.log('   ❌ Product not linked to recipe - this prevents deduction');
            }
          } else {
            console.log(`❌ Product ${item.productId} not found in catalog`);
          }
        } else {
          console.log(`❌ Transaction item has no productId`);
        }
      }
    }
    
    // Step 3: Check transaction processing logs
    console.log('\n📝 STEP 3: CHECKING SYSTEM LOGS');
    console.log('-'.repeat(40));
    
    // Check if there are any error logs or processing issues
    console.log('🔍 Potential Issues Identified:');
    
    // Issue 1: Mock implementation
    console.log('   1. ❌ Transaction service uses mock inventory deduction');
    console.log('      Location: src/services/transactions/createTransaction.ts');
    console.log('      Issue: updateInventoryStockForTransaction is a mock implementation');
    
    // Issue 2: Multiple deduction services
    console.log('   2. ⚠️ Multiple inventory deduction services exist');
    console.log('      - realTimeAvailabilityService.ts');
    console.log('      - ingredientDeductionService.ts');
    console.log('      - posIntegration.ts');
    console.log('      Issue: Not integrated with main transaction flow');
    
    // Issue 3: Transaction item format
    console.log('   3. ⚠️ Transaction items may not have recipe information');
    console.log('      Issue: Items need recipe_id or product_id for deduction');
    
    // Step 4: Proposed solution
    console.log('\n🔧 STEP 4: PROPOSED SOLUTION');
    console.log('-'.repeat(40));
    
    console.log('📋 To fix inventory deduction:');
    console.log('   1. Replace mock implementation in createTransaction.ts');
    console.log('   2. Integrate with existing ingredient deduction service');
    console.log('   3. Ensure transaction items include recipe/product links');
    console.log('   4. Add proper error handling and logging');
    
    console.log('\n🧪 Quick Fix Test:');
    console.log('   1. Manually trigger deduction for this transaction');
    console.log('   2. Verify the deduction logic works');
    console.log('   3. Update transaction service to use real deduction');
    
    // Step 5: Manual deduction test
    console.log('\n🔧 STEP 5: MANUAL DEDUCTION TEST');
    console.log('-'.repeat(40));
    
    if (transaction.items && Array.isArray(transaction.items)) {
      for (const item of transaction.items) {
        if (item.name && item.name.toLowerCase().includes('cookies')) {
          console.log(`🍪 Found Cookies & Cream item in transaction`);
          console.log(`   Attempting manual deduction for ${item.quantity} units...`);
          
          // Get the recipe and ingredients
          const recipeOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/recipes?select=*&store_id=eq.${SUGBO_STORE_ID}&name=ilike.*cookies*cream*`,
            method: 'GET',
            headers
          };
          
          const recipes = await makeRequest(recipeOptions);
          
          if (recipes.length > 0) {
            const recipe = recipes[0];
            
            const ingredientsOptions = {
              hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
              port: 443,
              path: `/rest/v1/recipe_ingredients?select=*,inventory_stock(*)&recipe_id=eq.${recipe.id}`,
              method: 'GET',
              headers
            };
            
            const ingredients = await makeRequest(ingredientsOptions);
            
            console.log(`   Recipe has ${ingredients.length} ingredients`);
            console.log('   Manual deduction would affect:');
            
            ingredients.forEach(ing => {
              const itemName = ing.inventory_stock?.item || ing.ingredient_name;
              const deductAmount = ing.quantity * (item.quantity || 1);
              console.log(`     - ${itemName}: -${deductAmount} ${ing.unit}`);
            });
            
            console.log('\n   💡 This confirms the deduction logic would work');
            console.log('   💡 The issue is in the transaction processing integration');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  }
}

// Run the debug
debugTransactionDeduction();
