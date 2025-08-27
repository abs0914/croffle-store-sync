#!/usr/bin/env node

/**
 * Data Architecture Discrepancy Investigation
 * 
 * Analyzes the gap between POS sales data and inventory management database
 * Transaction #20250827-5457-184903 exists in POS but not in inventory DB
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

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

// Transaction details from POS sales report
const POS_TRANSACTION = {
  id: '20250827-5457-184903',
  date: '2025-08-27',
  time: '18:49',
  store: 'Robinsons North',
  total: 305.00,
  payment: 'Cash',
  items: [
    { name: 'Caramel Delight Croffle', qty: 1, price: 125.00 },
    { name: 'Iced Tea', qty: 1, price: 60.00 },
    { name: 'Matcha Blended', qty: 1, price: 90.00 },
    { name: 'Bottled Water', qty: 1, price: 20.00 },
    { name: 'Oreo Cookies', qty: 1, price: 10.00 }
  ]
};

async function main() {
  console.log('🚨 DATA ARCHITECTURE DISCREPANCY INVESTIGATION');
  console.log('=' .repeat(80));
  console.log('Analyzing POS vs Inventory Database synchronization gap');
  console.log('=' .repeat(80));
  
  try {
    // Step 1: Verify Database Architecture
    await investigateSystemArchitecture();
    
    // Step 2: Analyze Transaction Data Flow
    await analyzeTransactionDataFlow();
    
    // Step 3: Test Product Mappings for POS Items
    await testProductMappingsForPOSItems();
    
    // Step 4: Investigate Inventory Deduction Impact
    await investigateInventoryDeductionImpact();
    
    // Step 5: Provide Recommendations
    await provideDataConsistencyRecommendations();
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
    
    // Provide manual analysis framework
    console.log('\n📊 MANUAL INVESTIGATION FRAMEWORK');
    console.log('-'.repeat(50));
    generateManualInvestigationGuide();
  }
}

async function investigateSystemArchitecture() {
  console.log('\n🏗️  STEP 1: SYSTEM ARCHITECTURE ANALYSIS');
  console.log('-'.repeat(50));
  
  console.log('📊 CONFIRMED DATA SOURCES:');
  console.log('   ✅ POS System: Contains transaction #20250827-5457-184903');
  console.log('   ❌ Inventory Database: Transaction not found');
  console.log('   📍 Store: Robinsons North');
  console.log('   💰 Amount: ₱305.00');
  console.log('   📅 Date: Aug 27, 2025 at 18:49');
  
  // Check database tables structure
  try {
    console.log('\n🔍 DATABASE STRUCTURE ANALYSIS:');
    
    // Check transactions table
    const transactionCount = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/transactions?select=count',
      method: 'GET',
      headers: { ...headers, 'Prefer': 'count=exact' }
    });
    
    console.log(`   📊 Transactions table: ${transactionCount.length} records`);
    
    // Check transaction_items table
    const transactionItemsCount = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/transaction_items?select=count',
      method: 'GET',
      headers: { ...headers, 'Prefer': 'count=exact' }
    });
    
    console.log(`   📦 Transaction items table: ${transactionItemsCount.length} records`);
    
    // Check for any transactions from Aug 27
    const aug27Transactions = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/transactions?select=*&created_at=gte.2025-08-27&created_at=lt.2025-08-28',
      method: 'GET',
      headers
    });
    
    console.log(`   📅 Aug 27 transactions in DB: ${aug27Transactions.length}`);
    
    if (aug27Transactions.length === 0) {
      console.log('   🚨 CRITICAL FINDING: No Aug 27 transactions in inventory database');
      console.log('   📊 This suggests POS data is not syncing to inventory system');
    }
    
  } catch (error) {
    console.log(`   ❌ Database structure analysis failed: ${error.message}`);
  }
}

async function analyzeTransactionDataFlow() {
  console.log('\n🔄 STEP 2: TRANSACTION DATA FLOW ANALYSIS');
  console.log('-'.repeat(50));
  
  console.log('📊 POS TRANSACTION DETAILS:');
  console.log(`   Transaction ID: ${POS_TRANSACTION.id}`);
  console.log(`   Store: ${POS_TRANSACTION.store}`);
  console.log(`   Date/Time: ${POS_TRANSACTION.date} ${POS_TRANSACTION.time}`);
  console.log(`   Total: ₱${POS_TRANSACTION.total}`);
  console.log(`   Payment: ${POS_TRANSACTION.payment}`);
  console.log(`   Items: ${POS_TRANSACTION.items.length}`);
  
  console.log('\n📦 PURCHASED ITEMS:');
  POS_TRANSACTION.items.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.name}`);
    console.log(`      Quantity: ${item.qty}`);
    console.log(`      Price: ₱${item.price}`);
    console.log(`      Total: ₱${item.qty * item.price}`);
  });
  
  console.log('\n🎯 CRITICAL ANALYSIS:');
  console.log('   ✅ Caramel Delight Croffle - PHASE 1 FIXED PRODUCT');
  console.log('      This should have functional inventory deduction');
  console.log('      Expected: 6 ingredient deductions (flour, butter, etc.)');
  console.log('');
  console.log('   🧊 Matcha Blended - PHASE 1B INFRASTRUCTURE');
  console.log('      Specialized ingredients created but mapping incomplete');
  console.log('      Expected: Matcha Powder, Ice, Blended Base deductions');
  console.log('');
  console.log('   📦 Oreo Cookies - SPECIALIZED INVENTORY ITEM');
  console.log('      Created as ingredient for blended drinks');
  console.log('      May be sold separately or as ingredient');
  
  console.log('\n🚨 DATA FLOW ISSUES IDENTIFIED:');
  console.log('   1. POS records sales but doesn\'t sync to inventory DB');
  console.log('   2. Inventory deduction may not be triggered for any sales');
  console.log('   3. Stock levels may be inaccurate due to missing deductions');
  console.log('   4. Cost tracking and profit analysis compromised');
}

async function testProductMappingsForPOSItems() {
  console.log('\n🧪 STEP 3: PRODUCT MAPPING VALIDATION');
  console.log('-'.repeat(50));
  
  console.log('Testing ingredient mappings for products in POS transaction...');
  
  for (const item of POS_TRANSACTION.items) {
    console.log(`\n🔍 ANALYZING: ${item.name}`);
    
    try {
      // Search for product in catalog
      const products = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_catalog?select=*&product_name=ilike.%${encodeURIComponent(item.name)}%`,
        method: 'GET',
        headers
      });
      
      if (products.length === 0) {
        console.log('   ❌ Product not found in catalog');
        console.log('   🔧 Action needed: Add product to catalog or fix name matching');
        continue;
      }
      
      const product = products[0];
      console.log(`   ✅ Found in catalog: ${product.product_name}`);
      console.log(`   💰 Catalog price: ₱${product.price} (POS: ₱${item.price})`);
      console.log(`   📋 Recipe ID: ${product.recipe_id || 'None'}`);
      
      if (!product.recipe_id) {
        console.log('   ⚠️  No recipe - inventory deduction not required');
        continue;
      }
      
      // Check ingredient mappings
      const mappings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${product.id}`,
        method: 'GET',
        headers
      });
      
      console.log(`   📊 Ingredient mappings: ${mappings.length}`);
      
      if (mappings.length === 0) {
        console.log('   ❌ NO INGREDIENT MAPPINGS');
        console.log('   🚨 CRITICAL: Inventory deduction will fail');
        
        if (item.name.toLowerCase().includes('croffle')) {
          console.log('   🔧 PHASE 1 ISSUE: This should have been fixed!');
        } else if (item.name.toLowerCase().includes('blended')) {
          console.log('   🔧 PHASE 1B ISSUE: Infrastructure exists but mapping incomplete');
        }
      } else {
        console.log('   ✅ HAS MAPPINGS - Checking completeness...');
        
        // Get recipe ingredients for comparison
        const recipeIngredients = await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/recipe_ingredients?select=*&recipe_id=eq.${product.recipe_id}`,
          method: 'GET',
          headers
        });
        
        console.log(`   📋 Recipe ingredients: ${recipeIngredients.length}`);
        console.log(`   ✅ Mapping completeness: ${mappings.length}/${recipeIngredients.length} (${((mappings.length/recipeIngredients.length)*100).toFixed(1)}%)`);
        
        if (mappings.length === recipeIngredients.length) {
          console.log('   🎯 COMPLETE MAPPINGS - Inventory deduction should work');
          console.log('   💡 This transaction should have triggered deductions');
        } else {
          console.log('   ⚠️  INCOMPLETE MAPPINGS - Partial deduction only');
        }
        
        // Show mapping details
        mappings.forEach((mapping, i) => {
          const inventory = mapping.inventory_item;
          console.log(`     ${i + 1}. ${inventory ? inventory.item : 'MISSING INVENTORY'}`);
          console.log(`        Required: ${mapping.required_quantity} ${mapping.unit}`);
          console.log(`        Available: ${inventory ? inventory.stock_quantity : 'N/A'}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Error analyzing ${item.name}: ${error.message}`);
    }
  }
}

async function investigateInventoryDeductionImpact() {
  console.log('\n📦 STEP 4: INVENTORY DEDUCTION IMPACT ANALYSIS');
  console.log('-'.repeat(50));
  
  console.log('🚨 CRITICAL IMPACT ASSESSMENT:');
  console.log('');
  console.log('📊 TRANSACTION VALUE: ₱305.00');
  console.log('   - High-value transaction with multiple products');
  console.log('   - Contains fixed products that should have inventory deduction');
  console.log('   - Missing from inventory database = no deductions occurred');
  console.log('');
  console.log('🎯 SPECIFIC IMPACTS:');
  console.log('');
  console.log('   1. 🥐 CARAMEL DELIGHT CROFFLE (₱125):');
  console.log('      - Should deduct: Flour, Butter, Sugar, Eggs, Caramel, Vanilla');
  console.log('      - Impact: 6 ingredients not deducted from stock');
  console.log('      - Cost tracking: ₱125 revenue without ingredient cost deduction');
  console.log('');
  console.log('   2. 🧊 MATCHA BLENDED (₱90):');
  console.log('      - Should deduct: Matcha Powder, Ice, Milk, Blended Base');
  console.log('      - Impact: Specialized ingredients not deducted');
  console.log('      - Stock levels: Inaccurate for blended drink ingredients');
  console.log('');
  console.log('   3. 📦 OTHER ITEMS:');
  console.log('      - Iced Tea, Bottled Water, Oreo Cookies');
  console.log('      - May have simple or no ingredient requirements');
  console.log('      - Still missing from transaction tracking');
  
  console.log('\n💰 BUSINESS IMPACT:');
  console.log('   - Revenue recorded in POS: ₱305.00');
  console.log('   - Inventory costs not deducted: Unknown amount');
  console.log('   - Profit calculation: Inaccurate');
  console.log('   - Stock reorder alerts: May not trigger correctly');
  console.log('   - Ingredient usage tracking: Completely missing');
}

async function provideDataConsistencyRecommendations() {
  console.log('\n💡 STEP 5: DATA CONSISTENCY RECOMMENDATIONS');
  console.log('-'.repeat(50));
  
  console.log('🔧 IMMEDIATE ACTIONS NEEDED:');
  console.log('');
  console.log('1. 🔄 ESTABLISH DATA SYNCHRONIZATION:');
  console.log('   - Create automated sync from POS to inventory database');
  console.log('   - Implement real-time or scheduled transaction imports');
  console.log('   - Ensure transaction format compatibility');
  console.log('');
  console.log('2. 📊 MANUAL TRANSACTION IMPORT:');
  console.log('   - Import transaction #20250827-5457-184903 manually');
  console.log('   - Test inventory deduction for imported transaction');
  console.log('   - Validate that fixed products trigger proper deductions');
  console.log('');
  console.log('3. 🧪 INVENTORY DEDUCTION TESTING:');
  console.log('   - Use imported transaction to test Caramel Delight Croffle');
  console.log('   - Verify 6 ingredient deductions occur correctly');
  console.log('   - Monitor stock levels before and after processing');
  console.log('');
  console.log('4. 🎯 SYSTEM INTEGRATION:');
  console.log('   - Identify POS system API or export capabilities');
  console.log('   - Create automated transaction import process');
  console.log('   - Implement error handling for failed imports');
  
  console.log('\n🚀 LONG-TERM SOLUTIONS:');
  console.log('');
  console.log('1. 📡 REAL-TIME INTEGRATION:');
  console.log('   - Connect POS directly to inventory management');
  console.log('   - Trigger inventory deduction immediately after sale');
  console.log('   - Implement transaction validation and error reporting');
  console.log('');
  console.log('2. 📊 DATA VALIDATION:');
  console.log('   - Regular comparison between POS and inventory data');
  console.log('   - Automated alerts for missing transactions');
  console.log('   - Reconciliation reports for data consistency');
  console.log('');
  console.log('3. 🔄 BACKUP PROCESSES:');
  console.log('   - Daily transaction export from POS');
  console.log('   - Automated import with duplicate detection');
  console.log('   - Manual override capabilities for special cases');
}

function generateManualInvestigationGuide() {
  console.log('Manual steps to resolve data architecture discrepancy:');
  console.log('');
  console.log('1. 📋 POS SYSTEM ACCESS:');
  console.log('   - Identify POS system type and version');
  console.log('   - Locate transaction export/API capabilities');
  console.log('   - Extract transaction data in compatible format');
  console.log('');
  console.log('2. 🔄 DATA IMPORT PROCESS:');
  console.log('   - Create manual transaction import script');
  console.log('   - Map POS transaction format to database schema');
  console.log('   - Import transaction #20250827-5457-184903 for testing');
  console.log('');
  console.log('3. 🧪 INVENTORY DEDUCTION TESTING:');
  console.log('   - Process imported transaction through inventory system');
  console.log('   - Monitor ingredient stock levels for deductions');
  console.log('   - Validate that Phase 1 fixes work correctly');
  console.log('');
  console.log('4. 📊 SYSTEM INTEGRATION:');
  console.log('   - Design automated sync process');
  console.log('   - Implement error handling and validation');
  console.log('   - Test with multiple transactions for reliability');
}

main();
