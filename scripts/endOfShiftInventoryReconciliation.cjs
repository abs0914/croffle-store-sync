#!/usr/bin/env node

/**
 * End of Shift Inventory Reconciliation
 * 
 * This script helps with manual inventory deduction at end of shift
 * by comparing start-of-shift inventory with sales data.
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

async function endOfShiftReconciliation() {
  console.log('📊 END OF SHIFT INVENTORY RECONCILIATION');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    // Step 1: Get today's transactions
    console.log('💳 STEP 1: ANALYZING TODAY\'S SALES');
    console.log('-'.repeat(40));
    
    const today = new Date().toISOString().split('T')[0];
    
    const transactionsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/transactions?select=*&store_id=eq.${SUGBO_STORE_ID}&created_at=gte.${today}T00:00:00&order=created_at.desc`,
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionsOptions);
    console.log(`📊 Found ${transactions.length} transactions today`);
    
    // Analyze sales by product
    const salesSummary = {};
    let totalSales = 0;
    
    transactions.forEach(txn => {
      totalSales += txn.total || 0;

      // Handle both array and JSON string formats
      let items = txn.items;
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (e) {
          console.log('⚠️ Failed to parse transaction items:', e.message);
          items = [];
        }
      }

      if (items && Array.isArray(items)) {
        items.forEach(item => {
          const productName = item.name || 'Unknown Product';
          const quantity = item.quantity || 1;

          if (!salesSummary[productName]) {
            salesSummary[productName] = {
              quantity: 0,
              revenue: 0,
              productId: item.productId
            };
          }

          salesSummary[productName].quantity += quantity;
          salesSummary[productName].revenue += (item.totalPrice || item.unitPrice || 0);
        });
      }
    });
    
    console.log(`💰 Total Sales: ₱${totalSales.toFixed(2)}`);
    console.log('\n📋 Sales Summary:');
    
    Object.entries(salesSummary).forEach(([product, data]) => {
      console.log(`   ${product}: ${data.quantity} sold (₱${data.revenue.toFixed(2)})`);
    });
    
    // Step 2: Calculate expected inventory deductions
    console.log('\n🧮 STEP 2: CALCULATING EXPECTED INVENTORY DEDUCTIONS');
    console.log('-'.repeat(40));
    
    const inventoryDeductions = {};
    
    for (const [productName, salesData] of Object.entries(salesSummary)) {
      if (salesData.productId) {
        // Get product's recipe
        const productOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?select=*&id=eq.${salesData.productId}`,
          method: 'GET',
          headers
        };
        
        const products = await makeRequest(productOptions);
        
        if (products.length > 0 && products[0].recipe_id) {
          const recipeId = products[0].recipe_id;
          
          // Get recipe ingredients
          const ingredientsOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/recipe_ingredients?select=*,inventory_stock(*)&recipe_id=eq.${recipeId}`,
            method: 'GET',
            headers
          };
          
          const ingredients = await makeRequest(ingredientsOptions);
          
          console.log(`\n🍽️ ${productName} (${salesData.quantity} sold):`);
          
          ingredients.forEach(ing => {
            const itemName = ing.inventory_stock?.item || ing.ingredient_name;
            const totalDeduction = ing.quantity * salesData.quantity;
            
            console.log(`   - ${itemName}: -${totalDeduction} ${ing.unit}`);
            
            if (!inventoryDeductions[itemName]) {
              inventoryDeductions[itemName] = {
                totalDeduction: 0,
                unit: ing.unit,
                inventoryId: ing.inventory_stock_id
              };
            }
            
            inventoryDeductions[itemName].totalDeduction += totalDeduction;
          });
        } else {
          console.log(`\n⚠️ ${productName}: No recipe found - manual count needed`);
        }
      }
    }
    
    // Step 3: Get current inventory levels
    console.log('\n📦 STEP 3: CURRENT INVENTORY LEVELS');
    console.log('-'.repeat(40));
    
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/inventory_stock?select=*&store_id=eq.${SUGBO_STORE_ID}`,
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    
    console.log('📊 Current vs Expected Inventory:');
    
    const reconciliationReport = [];
    
    Object.entries(inventoryDeductions).forEach(([itemName, deductionData]) => {
      const inventoryItem = inventory.find(item => item.item === itemName);
      
      if (inventoryItem) {
        const currentStock = inventoryItem.stock_quantity;
        const expectedStock = currentStock - deductionData.totalDeduction;
        
        console.log(`\n   ${itemName}:`);
        console.log(`      Current Stock: ${currentStock} ${deductionData.unit}`);
        console.log(`      Expected Deduction: -${deductionData.totalDeduction} ${deductionData.unit}`);
        console.log(`      Expected Remaining: ${expectedStock} ${deductionData.unit}`);
        
        reconciliationReport.push({
          item: itemName,
          currentStock: currentStock,
          expectedDeduction: deductionData.totalDeduction,
          expectedRemaining: expectedStock,
          unit: deductionData.unit,
          inventoryId: inventoryItem.id
        });
      }
    });
    
    // Step 4: Generate reconciliation report
    console.log('\n📋 STEP 4: END OF SHIFT RECONCILIATION REPORT');
    console.log('='.repeat(50));
    
    console.log(`📅 Date: ${today}`);
    console.log(`🏪 Store: Sugbo Mercado (IT Park, Cebu)`);
    console.log(`💰 Total Sales: ₱${totalSales.toFixed(2)}`);
    console.log(`📦 Transactions: ${transactions.length}`);
    
    console.log('\n📊 INVENTORY RECONCILIATION:');
    console.log('Item Name | Current | Deduction | Expected | Action Needed');
    console.log('-'.repeat(60));
    
    reconciliationReport.forEach(item => {
      const action = item.expectedRemaining < 0 ? 'CHECK STOCK' : 'UPDATE';
      console.log(`${item.item.padEnd(20)} | ${String(item.currentStock).padEnd(7)} | ${String(item.expectedDeduction).padEnd(9)} | ${String(item.expectedRemaining).padEnd(8)} | ${action}`);
    });
    
    // Step 5: Manual adjustment instructions
    console.log('\n🔧 STEP 5: MANUAL ADJUSTMENT INSTRUCTIONS');
    console.log('-'.repeat(40));
    
    console.log('📋 To complete end-of-shift reconciliation:');
    console.log('\n1. 📊 Physical Count:');
    console.log('   - Count actual remaining inventory');
    console.log('   - Compare with expected remaining amounts above');
    console.log('   - Note any discrepancies');
    
    console.log('\n2. 🔧 Update Inventory:');
    console.log('   - Use admin panel to adjust inventory levels');
    console.log('   - Set stock to actual counted amounts');
    console.log('   - Add notes for any discrepancies');
    
    console.log('\n3. 📝 Record Adjustments:');
    console.log('   - Document any waste, spillage, or theft');
    console.log('   - Update inventory movement logs');
    console.log('   - Prepare report for management');
    
    // Step 6: Generate update script (optional)
    console.log('\n💻 STEP 6: QUICK UPDATE COMMANDS');
    console.log('-'.repeat(40));
    
    console.log('📋 If physical count matches expected, run these updates:');
    
    reconciliationReport.forEach(item => {
      if (item.expectedRemaining >= 0) {
        console.log(`   UPDATE inventory_stock SET stock_quantity = ${item.expectedRemaining} WHERE id = '${item.inventoryId}';`);
      }
    });
    
    console.log('\n✅ End of shift reconciliation complete!');
    console.log('📊 Review the report above and perform physical inventory count.');
    
  } catch (error) {
    console.error('❌ Error during reconciliation:', error.message);
  }
}

// Run the reconciliation
endOfShiftReconciliation();
