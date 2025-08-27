#!/usr/bin/env node

/**
 * Deep Transaction Analysis
 * 
 * Detailed investigation of transaction 20250827-5369-101436 with data integrity checks
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const TARGET_TRANSACTION_ID = '20250827-5369-101436';

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
  console.log('🔬 DEEP TRANSACTION ANALYSIS');
  console.log('=' .repeat(80));
  console.log(`Transaction ID: ${TARGET_TRANSACTION_ID}`);
  console.log('=' .repeat(80));
  
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
  
  if (transactionItems.length === 0) {
    console.log('❌ NO TRANSACTION ITEMS FOUND - This is a critical data integrity issue!');
    return;
  }
  
  transactionItems.forEach((item, i) => {
    console.log(`\n   ITEM ${i + 1}:`);
    console.log(`     ID: ${item.id}`);
    console.log(`     Product ID: ${item.product_id}`);
    console.log(`     Product Name: ${item.product_name || 'NULL/UNDEFINED'}`);
    console.log(`     Quantity: ${item.quantity}`);
    console.log(`     Unit Price: ₱${item.unit_price}`);
    console.log(`     Total Price: ₱${item.total_price}`);
    console.log(`     Created: ${new Date(item.created_at).toLocaleString()}`);
  });
  
  // For each transaction item, get the actual product details
  console.log(`\n🔍 PRODUCT CATALOG LOOKUP:`);
  
  for (let i = 0; i < transactionItems.length; i++) {
    const item = transactionItems[i];
    console.log(`\n   ITEM ${i + 1} PRODUCT LOOKUP:`);
    
    if (!item.product_id) {
      console.log('     ❌ No product_id - cannot lookup product details');
      continue;
    }
    
    try {
      const productDetails = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_catalog?select=*&id=eq.${item.product_id}`,
        method: 'GET',
        headers
      });
      
      if (productDetails.length === 0) {
        console.log(`     ❌ Product not found in catalog (ID: ${item.product_id})`);
        console.log('     This indicates the product was deleted or the ID is invalid');
      } else {
        const product = productDetails[0];
        console.log(`     ✅ Product found in catalog:`);
        console.log(`        Name: ${product.product_name}`);
        console.log(`        Price: ₱${product.price}`);
        console.log(`        Available: ${product.is_available}`);
        console.log(`        Recipe ID: ${product.recipe_id || 'None'}`);
        console.log(`        Store ID: ${product.store_id}`);
        
        // Check if this is the Tiramisu Croffle
        if (product.product_name && product.product_name.toLowerCase().includes('tiramisu')) {
          console.log(`     🎯 FOUND TIRAMISU CROFFLE!`);
          await analyzeInventoryForProduct(product, item.quantity);
        }
      }
    } catch (error) {
      console.log(`     ❌ Error looking up product: ${error.message}`);
    }
  }
}

async function analyzeInventoryForProduct(product, quantity) {
  console.log(`\n🔄 INVENTORY ANALYSIS FOR: ${product.product_name}`);
  console.log('-'.repeat(50));
  
  // Get product ingredients
  try {
    const ingredients = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${product.id}`,
      method: 'GET',
      headers
    });
    
    console.log(`   📊 INGREDIENT MAPPINGS: ${ingredients.length} found`);
    
    if (ingredients.length === 0) {
      console.log('   ❌ NO INGREDIENT MAPPINGS');
      console.log('   🚨 CRITICAL ISSUE: No ingredients defined means no inventory deduction occurred!');
      console.log('   💡 SOLUTION: Add ingredient mappings to product_ingredients table');
      return;
    }
    
    console.log(`\n   🧪 INGREDIENT DETAILS:`);
    let hasStockIssues = false;
    let missingInventoryItems = 0;
    
    ingredients.forEach((ing, i) => {
      const stock = ing.inventory_item;
      const requiredQty = ing.required_quantity * quantity;
      
      console.log(`\n     ${i + 1}. INGREDIENT:`);
      console.log(`        Required Qty: ${ing.required_quantity} ${ing.unit} (x${quantity} = ${requiredQty})`);
      
      if (!stock) {
        console.log(`        ❌ INVENTORY ITEM: Missing from inventory_stock table`);
        console.log(`        🚨 CRITICAL: Cannot deduct inventory for missing item`);
        missingInventoryItems++;
        hasStockIssues = true;
      } else {
        console.log(`        ✅ INVENTORY ITEM: ${stock.item}`);
        console.log(`        📦 Current Stock: ${stock.stock_quantity} ${stock.unit}`);
        console.log(`        🏪 Store ID: ${stock.store_id}`);
        console.log(`        📊 Status: ${stock.is_active ? 'Active' : 'Inactive'}`);
        
        if (stock.stock_quantity < requiredQty) {
          console.log(`        ⚠️  INSUFFICIENT STOCK: Need ${requiredQty}, have ${stock.stock_quantity}`);
          hasStockIssues = true;
        } else {
          console.log(`        ✅ SUFFICIENT STOCK: Can fulfill requirement`);
        }
      }
    });
    
    // Summary
    console.log(`\n   📋 INVENTORY ANALYSIS SUMMARY:`);
    console.log(`      Total Ingredients: ${ingredients.length}`);
    console.log(`      Missing Inventory Items: ${missingInventoryItems}`);
    console.log(`      Stock Issues: ${hasStockIssues ? 'YES' : 'NO'}`);
    
    if (missingInventoryItems > 0) {
      console.log(`\n   🚨 CRITICAL PROBLEMS IDENTIFIED:`);
      console.log(`      - ${missingInventoryItems} ingredients have no inventory_stock entries`);
      console.log(`      - Inventory deduction would fail or be incomplete`);
      console.log(`      - This explains why inventory sync may not have worked`);
    }
    
    if (hasStockIssues && missingInventoryItems === 0) {
      console.log(`\n   ⚠️  STOCK PROBLEMS IDENTIFIED:`);
      console.log(`      - Some ingredients have insufficient stock`);
      console.log(`      - Transaction may have proceeded but inventory sync could fail`);
    }
    
    if (!hasStockIssues && missingInventoryItems === 0) {
      console.log(`\n   ✅ INVENTORY STATUS: All ingredients properly mapped and in stock`);
      console.log(`      - Inventory deduction should have succeeded`);
      console.log(`      - Need to check if deduction service was called`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error analyzing ingredients: ${error.message}`);
  }
}

main().catch(err => {
  console.error('Deep analysis failed:', err.message);
  process.exit(1);
});
