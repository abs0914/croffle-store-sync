#!/usr/bin/env node

/**
 * Specific Transaction Investigation Script
 * 
 * Investigates transaction 20250827-5369-101436 for inventory synchronization issues
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const TARGET_TRANSACTION_ID = '20250827-5369-101436';
const TARGET_DATE = '2025-08-27';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function req(options, data) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${json?.message || body}`));
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function auth() {
  const authRes = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  }, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers.Authorization = `Bearer ${authRes.access_token}`;
}

async function main() {
  console.log('🔍 TRANSACTION INVESTIGATION REPORT');
  console.log('=' .repeat(80));
  console.log(`Transaction ID: ${TARGET_TRANSACTION_ID}`);
  console.log(`Date: ${TARGET_DATE} 10:14 AM`);
  console.log(`Product: Tiramisu Croffle (1 unit)`);
  console.log('=' .repeat(80));
  
  await auth();

  // STEP 1: Transaction Completeness Check
  console.log('\n📋 STEP 1: TRANSACTION COMPLETENESS CHECK');
  console.log('-'.repeat(50));
  
  try {
    // Search for the transaction by receipt number
    const transactions = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transactions?select=*&receipt_number=eq.${TARGET_TRANSACTION_ID}`,
      method: 'GET',
      headers
    });
    
    if (transactions.length === 0) {
      console.log('❌ TRANSACTION NOT FOUND');
      console.log('   The transaction may not have been recorded in the database.');
      console.log('   This indicates a critical failure in transaction processing.');
      
      // Search by date range to see if there are any transactions around that time
      const dateTransactions = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/transactions?select=id,receipt_number,created_at,total,payment_method&created_at=gte.${TARGET_DATE}T00:00:00&created_at=lte.${TARGET_DATE}T23:59:59&order=created_at.desc`,
        method: 'GET',
        headers
      });
      
      console.log(`\n📅 TRANSACTIONS ON ${TARGET_DATE}:`);
      if (dateTransactions.length === 0) {
        console.log('   No transactions found for this date.');
      } else {
        dateTransactions.forEach((t, i) => {
          const time = new Date(t.created_at).toLocaleTimeString();
          console.log(`   ${i + 1}. ${t.receipt_number} - ${time} - ₱${t.total} (${t.payment_method})`);
        });
      }
      return;
    }
    
    const transaction = transactions[0];
    console.log('✅ TRANSACTION FOUND');
    console.log(`   ID: ${transaction.id}`);
    console.log(`   Receipt: ${transaction.receipt_number}`);
    console.log(`   Created: ${new Date(transaction.created_at).toLocaleString()}`);
    console.log(`   Store ID: ${transaction.store_id}`);
    console.log(`   Total: ₱${transaction.total}`);
    console.log(`   Payment Method: ${transaction.payment_method}`);
    console.log(`   Status: ${transaction.status || 'N/A'}`);
    
    // Check transaction items
    const transactionItems = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${transaction.id}`,
      method: 'GET',
      headers
    });
    
    console.log(`\n📦 TRANSACTION ITEMS (${transactionItems.length}):`);
    let tiramisuItem = null;
    transactionItems.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.product_name} - Qty: ${item.quantity} - ₱${item.unit_price} each`);
      if (item.product_name && item.product_name.toLowerCase().includes('tiramisu')) {
        tiramisuItem = item;
      }
    });
    
    if (!tiramisuItem) {
      console.log('❌ TIRAMISU CROFFLE NOT FOUND IN TRANSACTION ITEMS');
      return;
    }
    
    console.log(`\n🎯 TARGET ITEM FOUND:`);
    console.log(`   Product: ${tiramisuItem.product_name}`);
    console.log(`   Product ID: ${tiramisuItem.product_id}`);
    console.log(`   Quantity: ${tiramisuItem.quantity}`);
    console.log(`   Unit Price: ₱${tiramisuItem.unit_price}`);
    
    // Continue investigation in next part...
    await investigateInventorySync(transaction, tiramisuItem);

  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

async function investigateInventorySync(transaction, tiramisuItem) {
  // STEP 2: Inventory Synchronization Analysis
  console.log('\n🔄 STEP 2: INVENTORY SYNCHRONIZATION ANALYSIS');
  console.log('-'.repeat(50));

  // Get Tiramisu Croffle product details
  const productDetails = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=*&id=eq.${tiramisuItem.product_id}`,
    method: 'GET',
    headers
  });

  if (productDetails.length === 0) {
    console.log('❌ PRODUCT NOT FOUND IN CATALOG');
    return;
  }

  const product = productDetails[0];
  console.log(`✅ PRODUCT DETAILS:`);
  console.log(`   Name: ${product.product_name}`);
  console.log(`   Recipe ID: ${product.recipe_id || 'None'}`);
  console.log(`   Store ID: ${product.store_id}`);

  // Get product ingredients
  const ingredients = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${product.id}`,
    method: 'GET',
    headers
  });

  console.log(`\n🧪 INGREDIENT ANALYSIS (${ingredients.length} ingredients):`);
  if (ingredients.length === 0) {
    console.log('❌ NO INGREDIENTS DEFINED');
    console.log('   This product has no ingredient mappings, so no inventory deduction would occur.');
  } else {
    ingredients.forEach((ing, i) => {
      const stock = ing.inventory_item;
      console.log(`   ${i + 1}. ${stock ? stock.item : 'Unknown Item'}`);
      console.log(`      Required: ${ing.required_quantity} ${ing.unit}`);
      console.log(`      Current Stock: ${stock ? stock.stock_quantity : 'N/A'} ${stock ? stock.unit : ''}`);
      console.log(`      Stock Status: ${stock ? (stock.stock_quantity > 0 ? 'Available' : 'Out of Stock') : 'Missing'}`);
    });
  }

  await checkSyncLogs(transaction, ingredients);
}

async function checkSyncLogs(transaction, ingredients) {
  // Check inventory sync logs
  console.log('\n📊 INVENTORY SYNC LOGS:');
  try {
    const syncLogs = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/inventory_sync_logs?select=*&transaction_id=eq.${transaction.id}&order=created_at.desc`,
      method: 'GET',
      headers
    });

    if (syncLogs.length === 0) {
      console.log('❌ NO SYNC LOGS FOUND');
      console.log('   This indicates inventory deduction may not have been attempted.');
    } else {
      syncLogs.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.sync_status} - ${new Date(log.created_at).toLocaleTimeString()}`);
        if (log.error_details) {
          console.log(`      Error: ${log.error_details}`);
        }
        if (log.affected_inventory_items) {
          console.log(`      Affected Items: ${log.affected_inventory_items}`);
        }
      });
    }
  } catch (error) {
    console.log('⚠️  Could not fetch sync logs (table may not exist)');
  }

  // Check transaction error logs
  console.log('\n🚨 TRANSACTION ERROR LOGS:');
  try {
    const errorLogs = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transaction_error_logs?select=*&transaction_id=eq.${transaction.id}&order=created_at.desc`,
      method: 'GET',
      headers
    });

    if (errorLogs.length === 0) {
      console.log('✅ NO ERROR LOGS FOUND');
    } else {
      errorLogs.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.error_type} - ${new Date(log.created_at).toLocaleTimeString()}`);
        console.log(`      Message: ${log.error_message}`);
        if (log.context) {
          console.log(`      Context: ${log.context}`);
        }
      });
    }
  } catch (error) {
    console.log('⚠️  Could not fetch error logs (table may not exist)');
  }

  await provideSolutions(ingredients);
}

async function provideSolutions(ingredients) {
  // STEP 3: Problem Identification & Solutions
  console.log('\n🎯 STEP 3: PROBLEM IDENTIFICATION & SOLUTIONS');
  console.log('-'.repeat(50));

  const problems = [];
  const solutions = [];

  if (ingredients.length === 0) {
    problems.push('No ingredient mappings defined for Tiramisu Croffle');
    solutions.push('Add ingredient mappings in product_ingredients table');
  }

  ingredients.forEach(ing => {
    if (!ing.inventory_item) {
      problems.push(`Missing inventory item for ingredient: ${ing.required_quantity} ${ing.unit}`);
      solutions.push('Create corresponding inventory_stock entries');
    } else if (ing.inventory_item.stock_quantity <= 0) {
      problems.push(`Out of stock: ${ing.inventory_item.item}`);
      solutions.push(`Restock ${ing.inventory_item.item} in inventory`);
    }
  });

  if (problems.length === 0) {
    console.log('✅ NO OBVIOUS PROBLEMS DETECTED');
    console.log('   The transaction appears to be properly structured.');
    console.log('   Inventory deduction should have occurred if the service was called.');
  } else {
    console.log('❌ PROBLEMS IDENTIFIED:');
    problems.forEach((problem, i) => {
      console.log(`   ${i + 1}. ${problem}`);
    });

    console.log('\n🔧 RECOMMENDED SOLUTIONS:');
    solutions.forEach((solution, i) => {
      console.log(`   ${i + 1}. ${solution}`);
    });
  }

  console.log('\n📋 INVESTIGATION SUMMARY:');
  console.log(`   Ingredient Mappings: ${ingredients.length > 0 ? 'Present' : 'Missing'}`);
  console.log(`   Inventory Items: ${ingredients.filter(i => i.inventory_item).length}/${ingredients.length} mapped`);
  console.log(`   Problems Found: ${problems.length}`);
}

main().catch(err => {
  console.error('Investigation script failed:', err.message);
  process.exit(1);
});
