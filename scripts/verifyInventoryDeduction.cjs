#!/usr/bin/env node

/**
 * Verify Inventory Deduction
 * 
 * This script checks if inventory deduction is working after placing
 * a Cookies & Cream Croffle order.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
const COOKIES_CREAM_RECIPE_ID = '70836c5c-28b1-4214-af22-017bef9e3a20';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// Expected inventory levels before test (from previous script)
const EXPECTED_BEFORE = {
  'REGULAR CROISSANT': 125,
  'WHIPPED CREAM': 129,
  'Oreo Cookies': 53,
  'Oreo Crushed': 48,
  'Chopstick': 92,
  'Wax Paper': 74
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

async function verifyInventoryDeduction() {
  console.log('🔍 VERIFYING INVENTORY DEDUCTION');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Step 1: Check current inventory levels
    console.log('📦 STEP 1: CHECKING CURRENT INVENTORY LEVELS');
    console.log('-'.repeat(40));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_stock?select=*&store_id=eq.${SUGBO_STORE_ID}`,
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    
    // Get recipe ingredients for comparison
    const ingredientsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_ingredients?select=*,inventory_stock(*)&recipe_id=eq.${COOKIES_CREAM_RECIPE_ID}`,
      method: 'GET',
      headers
    };
    
    const recipeIngredients = await makeRequest(ingredientsOptions);
    
    console.log(`📊 Recipe has ${recipeIngredients.length} ingredients`);
    console.log('📋 Current vs Expected Inventory Levels:');
    
    let deductionDetected = false;
    const inventoryChanges = [];
    
    recipeIngredients.forEach(ingredient => {
      const inventoryItem = inventory.find(item => item.id === ingredient.inventory_stock_id);
      const itemName = inventoryItem?.item || ingredient.ingredient_name;
      const currentStock = inventoryItem?.stock_quantity || 0;
      const expectedBefore = EXPECTED_BEFORE[itemName] || 0;
      const expectedAfter = expectedBefore - ingredient.quantity;
      
      const change = expectedBefore - currentStock;
      const deducted = change === ingredient.quantity;
      
      console.log(`   ${deducted ? '✅' : '❌'} ${itemName}:`);
      console.log(`      Before: ${expectedBefore}, Current: ${currentStock}, Expected After: ${expectedAfter}`);
      console.log(`      Change: ${change}, Expected Deduction: ${ingredient.quantity}`);
      
      if (deducted) {
        deductionDetected = true;
      }
      
      inventoryChanges.push({
        item: itemName,
        before: expectedBefore,
        current: currentStock,
        expectedDeduction: ingredient.quantity,
        actualChange: change,
        deducted: deducted
      });
    });
    
    // Step 2: Check recent transactions
    console.log('\n💳 STEP 2: CHECKING RECENT TRANSACTIONS');
    console.log('-'.repeat(40));
    
    const transactionsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?select=*&store_id=eq.${SUGBO_STORE_ID}&order=created_at.desc&limit=5`,
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionsOptions);
    console.log(`💰 Found ${transactions.length} recent transactions`);
    
    if (transactions.length > 0) {
      console.log('\n📋 Recent transactions:');
      transactions.forEach((txn, index) => {
        const timeAgo = new Date(Date.now() - new Date(txn.created_at).getTime()).getMinutes();
        console.log(`   ${index + 1}. ${txn.receipt_number}: ₱${txn.total} (${timeAgo} min ago)`);
        
        if (txn.items && Array.isArray(txn.items)) {
          txn.items.forEach(item => {
            if (item.name && item.name.toLowerCase().includes('cookies')) {
              console.log(`      🍪 Contains Cookies & Cream item!`);
            }
          });
        }
      });
    }
    
    // Step 3: Check inventory movements
    console.log('\n📈 STEP 3: CHECKING INVENTORY MOVEMENTS');
    console.log('-'.repeat(40));
    
    const movementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_movements?select=*&order=created_at.desc&limit=10',
      method: 'GET',
      headers
    };
    
    const movements = await makeRequest(movementsOptions);
    console.log(`📊 Found ${movements.length} inventory movements`);
    
    if (movements.length > 0) {
      console.log('\n📋 Recent inventory movements:');
      movements.forEach((movement, index) => {
        const timeAgo = new Date(Date.now() - new Date(movement.created_at).getTime()).getMinutes();
        console.log(`   ${index + 1}. ${movement.movement_type}: ${movement.quantity_change} (${timeAgo} min ago)`);
        if (movement.notes) {
          console.log(`      Notes: ${movement.notes}`);
        }
      });
    } else {
      console.log('⚠️ No inventory movements found');
    }
    
    // Step 4: Summary and diagnosis
    console.log('\n🎯 STEP 4: INVENTORY DEDUCTION ANALYSIS');
    console.log('='.repeat(50));
    
    const deductedCount = inventoryChanges.filter(change => change.deducted).length;
    const totalIngredients = inventoryChanges.length;
    
    console.log(`📊 Deduction Summary:`);
    console.log(`   Total Ingredients: ${totalIngredients}`);
    console.log(`   Successfully Deducted: ${deductedCount}`);
    console.log(`   Failed Deductions: ${totalIngredients - deductedCount}`);
    console.log(`   Recent Transactions: ${transactions.length}`);
    console.log(`   Inventory Movements: ${movements.length}`);
    
    if (deductedCount === totalIngredients) {
      console.log('\n🎉 SUCCESS: Inventory deduction is working perfectly!');
      console.log('✅ All ingredients were properly deducted from inventory');
      console.log('✅ Transaction was recorded');
      if (movements.length > 0) {
        console.log('✅ Inventory movements were logged');
      }
    } else if (deductedCount > 0) {
      console.log('\n⚠️ PARTIAL SUCCESS: Some ingredients were deducted');
      console.log(`✅ ${deductedCount} ingredients deducted correctly`);
      console.log(`❌ ${totalIngredients - deductedCount} ingredients not deducted`);
    } else if (transactions.length > 0) {
      console.log('\n❌ TRANSACTION RECORDED BUT NO DEDUCTION');
      console.log('✅ Transaction was created');
      console.log('❌ No inventory was deducted');
      console.log('🔧 Check inventory deduction logic in transaction processing');
    } else {
      console.log('\n❌ NO TRANSACTION OR DEDUCTION DETECTED');
      console.log('🧪 Please place a test order and run this script again');
      console.log('📋 Test Instructions:');
      console.log('   1. Go to POS: https://preview--croffle-store-sync.lovable.app/');
      console.log('   2. Select Sugbo Mercado store');
      console.log('   3. Add "Cookies & Cream" to cart');
      console.log('   4. Complete the transaction');
      console.log('   5. Run this script again');
    }
    
    // Step 5: Detailed ingredient analysis
    if (deductedCount < totalIngredients) {
      console.log('\n🔍 DETAILED INGREDIENT ANALYSIS:');
      console.log('-'.repeat(40));
      
      inventoryChanges.forEach(change => {
        if (!change.deducted) {
          console.log(`❌ ${change.item}:`);
          console.log(`   Expected deduction: ${change.expectedDeduction}`);
          console.log(`   Actual change: ${change.actualChange}`);
          
          if (change.actualChange === 0) {
            console.log(`   Issue: No deduction occurred`);
          } else if (change.actualChange !== change.expectedDeduction) {
            console.log(`   Issue: Wrong deduction amount`);
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

// Run the verification
verifyInventoryDeduction();
