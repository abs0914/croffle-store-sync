#!/usr/bin/env node

/**
 * Detailed Transaction Analysis
 * 
 * Deep investigation of transaction 20250827-3930-142516 with product ID lookup
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const TARGET_TRANSACTION_ID = '20250827-3930-142516';

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
  console.log('🔬 DETAILED TRANSACTION ANALYSIS');
  console.log('=' .repeat(70));
  console.log(`Transaction ID: ${TARGET_TRANSACTION_ID}`);
  console.log('=' .repeat(70));
  
  await auth();

  // Get the transaction
  const transactions = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/transactions?select=*&receipt_number=eq.${TARGET_TRANSACTION_ID}`,
    method: 'GET',
    headers
  });
  
  if (transactions.length === 0) {
    console.log('❌ Transaction not found');
    return;
  }
  
  const transaction = transactions[0];
  console.log('\n📋 TRANSACTION DETAILS:');
  console.log(`   ID: ${transaction.id}`);
  console.log(`   Receipt: ${transaction.receipt_number}`);
  console.log(`   Store ID: ${transaction.store_id}`);
  console.log(`   Total: ₱${transaction.total}`);
  console.log(`   Payment Method: ${transaction.payment_method}`);
  console.log(`   Created: ${new Date(transaction.created_at).toLocaleString()}`);
  
  // Get transaction items with ALL fields
  const transactionItems = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${transaction.id}`,
    method: 'GET',
    headers
  });
  
  console.log(`\n📦 TRANSACTION ITEMS ANALYSIS (${transactionItems.length} items):`);
  
  for (let i = 0; i < transactionItems.length; i++) {
    const item = transactionItems[i];
    console.log(`\n   ITEM ${i + 1}:`);
    console.log(`     Transaction Item ID: ${item.id}`);
    console.log(`     Product ID: ${item.product_id}`);
    console.log(`     Product Name (stored): ${item.product_name || 'NULL/UNDEFINED'}`);
    console.log(`     Quantity: ${item.quantity}`);
    console.log(`     Unit Price: ₱${item.unit_price}`);
    console.log(`     Total Price: ₱${item.total_price}`);
    
    // Look up the actual product details
    if (item.product_id) {
      console.log(`\n   🔍 PRODUCT LOOKUP FOR ID: ${item.product_id}`);
      
      try {
        const productDetails = await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/product_catalog?select=*&id=eq.${item.product_id}`,
          method: 'GET',
          headers
        });
        
        if (productDetails.length === 0) {
          console.log(`     ❌ Product not found in catalog`);
        } else {
          const product = productDetails[0];
          console.log(`     ✅ PRODUCT FOUND:`);
          console.log(`        Name: ${product.product_name}`);
          console.log(`        Price: ₱${product.price}`);
          console.log(`        Available: ${product.is_available}`);
          console.log(`        Recipe ID: ${product.recipe_id || 'None'}`);
          console.log(`        Store ID: ${product.store_id}`);
          
          // Check if this is Tiramisu Croffle
          if (product.product_name && product.product_name.toLowerCase().includes('tiramisu')) {
            console.log(`\n     🎯 TIRAMISU CROFFLE CONFIRMED!`);
            await analyzeIngredientMappings(product, item.quantity);
            await checkInventoryStatus(product, item.quantity);
          }
        }
      } catch (error) {
        console.log(`     ❌ Error looking up product: ${error.message}`);
      }
    } else {
      console.log(`     ❌ No product ID - cannot lookup product details`);
    }
  }
}

async function analyzeIngredientMappings(product, quantity) {
  console.log(`\n     🧪 INGREDIENT MAPPINGS ANALYSIS:`);
  console.log(`     ${'='.repeat(40)}`);
  
  try {
    // Get ingredient mappings
    const mappings = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${product.id}`,
      method: 'GET',
      headers
    });
    
    console.log(`     📊 MAPPINGS FOUND: ${mappings.length}`);
    
    if (mappings.length === 0) {
      console.log(`     ❌ NO INGREDIENT MAPPINGS - FIX NOT APPLIED`);
      console.log(`     🚨 CRITICAL: This product cannot deduct inventory!`);
      return false;
    }
    
    console.log(`\n     📋 INGREDIENT DETAILS:`);
    let allMappingsValid = true;
    let sufficientStock = true;
    
    mappings.forEach((mapping, i) => {
      const inventory = mapping.inventory_item;
      const requiredQty = mapping.required_quantity * quantity;
      
      console.log(`\n       ${i + 1}. INGREDIENT MAPPING:`);
      console.log(`          Inventory Item: ${inventory ? inventory.item : '❌ MISSING'}`);
      console.log(`          Required per unit: ${mapping.required_quantity} ${mapping.unit}`);
      console.log(`          Required for transaction: ${requiredQty} ${mapping.unit}`);
      
      if (!inventory) {
        console.log(`          Status: ❌ MISSING INVENTORY ITEM`);
        allMappingsValid = false;
      } else {
        console.log(`          Available Stock: ${inventory.stock_quantity} ${inventory.unit}`);
        console.log(`          Store ID: ${inventory.store_id}`);
        console.log(`          Active: ${inventory.is_active ? 'Yes' : 'No'}`);
        
        if (inventory.stock_quantity >= requiredQty) {
          console.log(`          Status: ✅ SUFFICIENT STOCK`);
        } else {
          console.log(`          Status: ❌ INSUFFICIENT STOCK`);
          sufficientStock = false;
        }
      }
    });
    
    // Summary
    console.log(`\n     📊 MAPPING ANALYSIS SUMMARY:`);
    console.log(`        Total Mappings: ${mappings.length}`);
    console.log(`        Expected for Tiramisu: 6 ingredients`);
    console.log(`        Mapping Status: ${mappings.length >= 6 ? '✅ COMPLETE' : '⚠️ INCOMPLETE'}`);
    console.log(`        Inventory Status: ${allMappingsValid ? '✅ ALL VALID' : '❌ MISSING ITEMS'}`);
    console.log(`        Stock Status: ${sufficientStock ? '✅ SUFFICIENT' : '❌ INSUFFICIENT'}`);
    
    // Overall assessment
    if (mappings.length >= 6 && allMappingsValid && sufficientStock) {
      console.log(`\n     ✅ INVENTORY DEDUCTION SHOULD WORK CORRECTLY`);
      console.log(`        All ingredients mapped with sufficient stock`);
      return true;
    } else {
      console.log(`\n     ❌ INVENTORY DEDUCTION ISSUES DETECTED`);
      if (mappings.length < 6) console.log(`        - Incomplete mappings (${mappings.length}/6)`);
      if (!allMappingsValid) console.log(`        - Missing inventory items`);
      if (!sufficientStock) console.log(`        - Insufficient stock levels`);
      return false;
    }
    
  } catch (error) {
    console.log(`     ❌ Error analyzing mappings: ${error.message}`);
    return false;
  }
}

async function checkInventoryStatus(product, quantity) {
  console.log(`\n     📦 INVENTORY STATUS CHECK:`);
  console.log(`     ${'='.repeat(40)}`);
  
  try {
    // Check for any inventory sync logs for this transaction
    const syncLogs = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/inventory_sync_logs?select=*&product_id=eq.${product.id}&order=created_at.desc&limit=5`,
      method: 'GET',
      headers
    });
    
    if (syncLogs.length > 0) {
      console.log(`     ✅ INVENTORY SYNC LOGS FOUND: ${syncLogs.length} recent entries`);
      
      syncLogs.forEach((log, i) => {
        console.log(`       ${i + 1}. ${log.sync_status} - ${new Date(log.created_at).toLocaleString()}`);
        if (log.error_details) {
          console.log(`          Error: ${log.error_details}`);
        }
      });
    } else {
      console.log(`     ⚠️ NO INVENTORY SYNC LOGS FOUND`);
      console.log(`        This could indicate:`);
      console.log(`        1. Inventory deduction was not attempted`);
      console.log(`        2. Sync logging is not implemented`);
      console.log(`        3. Deduction service is not working`);
    }
    
    // Check recent inventory movements
    console.log(`\n     📊 RECENT INVENTORY ACTIVITY:`);
    
    const recentTransactions = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/transactions?select=id,receipt_number,created_at,total&store_id=eq.${product.store_id}&created_at=gte.2025-08-27T00:00:00&order=created_at.desc&limit=5`,
      method: 'GET',
      headers
    });
    
    console.log(`        Recent transactions today: ${recentTransactions.length}`);
    recentTransactions.forEach((txn, i) => {
      const isTarget = txn.receipt_number === TARGET_TRANSACTION_ID;
      console.log(`        ${i + 1}. ${txn.receipt_number} - ₱${txn.total} ${isTarget ? '← TARGET' : ''}`);
    });
    
  } catch (error) {
    console.log(`     ❌ Error checking inventory status: ${error.message}`);
  }
}

main().catch(err => {
  console.error('Detailed analysis failed:', err.message);
  process.exit(1);
});
