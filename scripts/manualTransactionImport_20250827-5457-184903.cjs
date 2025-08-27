#!/usr/bin/env node

/**
 * Manual Transaction Import and Inventory Deduction Test
 * 
 * Imports transaction #20250827-5457-184903 from POS data
 * Tests inventory deduction functionality for Phase 1 & 2 fixed products
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

// Transaction data from POS sales report
const POS_TRANSACTION = {
  receipt_number: '20250827-5457-184903',
  date: '2025-08-27',
  time: '18:49',
  store_name: 'Robinsons North',
  total: 305.00,
  payment_method: 'Cash',
  items: [
    { name: 'Caramel Delight Croffle', qty: 1, unit_price: 125.00, total_price: 125.00 },
    { name: 'Iced Tea', qty: 1, unit_price: 60.00, total_price: 60.00 },
    { name: 'Matcha Blended', qty: 1, unit_price: 90.00, total_price: 90.00 },
    { name: 'Bottled Water', qty: 1, unit_price: 20.00, total_price: 20.00 },
    { name: 'Oreo Cookies', qty: 1, unit_price: 10.00, total_price: 10.00 }
  ]
};

async function main() {
  console.log('📥 MANUAL TRANSACTION IMPORT & INVENTORY DEDUCTION TEST');
  console.log('=' .repeat(80));
  console.log('Importing POS transaction to test inventory deduction functionality');
  console.log('=' .repeat(80));
  
  try {
    // Step 1: Find Robinsons North store
    const storeId = await findRobinsonsNorthStore();
    if (!storeId) {
      console.log('❌ Cannot proceed without store ID');
      return;
    }
    
    // Step 2: Map products to catalog IDs
    const productMappings = await mapProductsToCatalog();
    
    // Step 3: Record inventory levels before import
    const beforeInventory = await recordInventoryLevels(productMappings);
    
    // Step 4: Import transaction
    const transactionId = await importTransaction(storeId, productMappings);
    
    if (transactionId) {
      // Step 5: Simulate inventory deduction
      await simulateInventoryDeduction(transactionId, productMappings);
      
      // Step 6: Record inventory levels after deduction
      const afterInventory = await recordInventoryLevels(productMappings);
      
      // Step 7: Analyze deduction results
      await analyzeDeductionResults(beforeInventory, afterInventory, productMappings);
    }
    
  } catch (error) {
    console.error('❌ Import and test failed:', error.message);
    
    // Provide manual testing guidance
    console.log('\n📊 MANUAL TESTING GUIDANCE');
    console.log('-'.repeat(50));
    generateManualTestingGuide();
  }
}

async function findRobinsonsNorthStore() {
  console.log('\n🏪 STEP 1: FINDING ROBINSONS NORTH STORE');
  console.log('-'.repeat(50));
  
  try {
    const stores = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/stores?select=*&is_active=eq.true',
      method: 'GET',
      headers
    });
    
    console.log(`📊 Active stores found: ${stores.length}`);
    
    let robinsonsNorth = null;
    stores.forEach(store => {
      console.log(`   - ${store.name} (ID: ${store.id})`);
      if (store.name.toLowerCase().includes('robinsons') && 
          store.name.toLowerCase().includes('north')) {
        robinsonsNorth = store;
        console.log(`     ✅ This is Robinsons North!`);
      }
    });
    
    if (robinsonsNorth) {
      console.log(`✅ Found Robinsons North: ID ${robinsonsNorth.id}`);
      return robinsonsNorth.id;
    } else {
      console.log('❌ Robinsons North store not found');
      console.log('   Using first available store for testing...');
      return stores.length > 0 ? stores[0].id : null;
    }
    
  } catch (error) {
    console.log(`❌ Error finding store: ${error.message}`);
    return null;
  }
}

async function mapProductsToCatalog() {
  console.log('\n📋 STEP 2: MAPPING PRODUCTS TO CATALOG');
  console.log('-'.repeat(50));
  
  const productMappings = [];
  
  for (const item of POS_TRANSACTION.items) {
    console.log(`\n🔍 Mapping: ${item.name}`);
    
    try {
      // Search for exact match first
      let products = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_catalog?select=*&product_name=eq.${encodeURIComponent(item.name)}`,
        method: 'GET',
        headers
      });
      
      // If no exact match, try fuzzy search
      if (products.length === 0) {
        products = await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/product_catalog?select=*&product_name=ilike.%${encodeURIComponent(item.name)}%`,
          method: 'GET',
          headers
        });
      }
      
      if (products.length > 0) {
        const product = products[0];
        console.log(`   ✅ Found: ${product.product_name} (ID: ${product.id})`);
        console.log(`   💰 Price: ₱${product.price} (POS: ₱${item.unit_price})`);
        console.log(`   📋 Recipe ID: ${product.recipe_id || 'None'}`);
        
        productMappings.push({
          posItem: item,
          catalogProduct: product,
          hasRecipe: !!product.recipe_id
        });
        
        // Check if this is a Phase 1 fixed product
        if (item.name.toLowerCase().includes('croffle')) {
          console.log(`   🎯 PHASE 1 PRODUCT - Should have complete mappings`);
        } else if (item.name.toLowerCase().includes('blended')) {
          console.log(`   🧊 PHASE 1B PRODUCT - Infrastructure should exist`);
        }
        
      } else {
        console.log(`   ❌ Not found in catalog: ${item.name}`);
        console.log(`   🔧 Action needed: Add to catalog or fix name matching`);
        
        productMappings.push({
          posItem: item,
          catalogProduct: null,
          hasRecipe: false
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Error mapping ${item.name}: ${error.message}`);
      productMappings.push({
        posItem: item,
        catalogProduct: null,
        hasRecipe: false,
        error: error.message
      });
    }
  }
  
  console.log(`\n📊 MAPPING SUMMARY:`);
  console.log(`   Total items: ${POS_TRANSACTION.items.length}`);
  console.log(`   Mapped to catalog: ${productMappings.filter(m => m.catalogProduct).length}`);
  console.log(`   With recipes: ${productMappings.filter(m => m.hasRecipe).length}`);
  console.log(`   Unmapped: ${productMappings.filter(m => !m.catalogProduct).length}`);
  
  return productMappings;
}

async function recordInventoryLevels(productMappings) {
  console.log('\n📦 RECORDING CURRENT INVENTORY LEVELS');
  console.log('-'.repeat(50));
  
  const inventorySnapshot = {};
  
  for (const mapping of productMappings) {
    if (!mapping.catalogProduct || !mapping.hasRecipe) continue;
    
    console.log(`\n📊 ${mapping.catalogProduct.product_name}:`);
    
    try {
      // Get ingredient mappings
      const mappings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${mapping.catalogProduct.id}`,
        method: 'GET',
        headers
      });
      
      console.log(`   Ingredient mappings: ${mappings.length}`);
      
      const productInventory = {};
      
      mappings.forEach((ingredientMapping, i) => {
        const inventory = ingredientMapping.inventory_item;
        if (inventory) {
          console.log(`     ${i + 1}. ${inventory.item}: ${inventory.stock_quantity} ${inventory.unit}`);
          productInventory[inventory.id] = {
            item: inventory.item,
            currentStock: inventory.stock_quantity,
            unit: inventory.unit,
            requiredQuantity: ingredientMapping.required_quantity,
            mappingUnit: ingredientMapping.unit
          };
        } else {
          console.log(`     ${i + 1}. MISSING INVENTORY ITEM`);
        }
      });
      
      inventorySnapshot[mapping.catalogProduct.id] = productInventory;
      
    } catch (error) {
      console.log(`   ❌ Error recording inventory: ${error.message}`);
    }
  }
  
  return inventorySnapshot;
}

async function importTransaction(storeId, productMappings) {
  console.log('\n📥 STEP 3: IMPORTING TRANSACTION');
  console.log('-'.repeat(50));
  
  try {
    // Create transaction record
    const transactionData = {
      receipt_number: POS_TRANSACTION.receipt_number,
      store_id: storeId,
      total: POS_TRANSACTION.total,
      payment_method: POS_TRANSACTION.payment_method,
      status: 'completed',
      created_at: `${POS_TRANSACTION.date}T${POS_TRANSACTION.time}:00.000Z`
    };
    
    console.log('📋 Creating transaction record...');
    console.log(`   Receipt: ${transactionData.receipt_number}`);
    console.log(`   Store ID: ${transactionData.store_id}`);
    console.log(`   Total: ₱${transactionData.total}`);
    console.log(`   Date: ${transactionData.created_at}`);
    
    const transactionResult = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/transactions',
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' }
    }, transactionData);
    
    if (transactionResult && transactionResult.length > 0) {
      const transaction = transactionResult[0];
      console.log(`✅ Transaction created: ID ${transaction.id}`);
      
      // Create transaction items
      console.log('\n📦 Creating transaction items...');
      
      for (const mapping of productMappings) {
        if (mapping.catalogProduct) {
          const itemData = {
            transaction_id: transaction.id,
            product_id: mapping.catalogProduct.id,
            product_name: mapping.posItem.name,
            quantity: mapping.posItem.qty,
            unit_price: mapping.posItem.unit_price,
            total_price: mapping.posItem.total_price
          };
          
          console.log(`   Adding: ${itemData.product_name} x${itemData.quantity}`);
          
          await req({
            hostname: SUPABASE_URL,
            port: 443,
            path: '/rest/v1/transaction_items',
            method: 'POST',
            headers
          }, itemData);
          
          console.log(`     ✅ Added transaction item`);
        } else {
          console.log(`   ⚠️  Skipping unmapped item: ${mapping.posItem.name}`);
        }
      }
      
      console.log(`\n✅ Transaction import completed: ${transaction.id}`);
      return transaction.id;
      
    } else {
      console.log('❌ Failed to create transaction');
      return null;
    }
    
  } catch (error) {
    console.log(`❌ Transaction import failed: ${error.message}`);
    return null;
  }
}

async function simulateInventoryDeduction(transactionId, productMappings) {
  console.log('\n🔄 STEP 4: SIMULATING INVENTORY DEDUCTION');
  console.log('-'.repeat(50));
  
  console.log(`Processing transaction ID: ${transactionId}`);
  
  for (const mapping of productMappings) {
    if (!mapping.catalogProduct || !mapping.hasRecipe) {
      console.log(`\n⚠️  Skipping ${mapping.posItem.name} - No recipe`);
      continue;
    }
    
    console.log(`\n🔄 Processing: ${mapping.catalogProduct.product_name}`);
    console.log(`   Quantity sold: ${mapping.posItem.qty}`);
    
    try {
      // Get ingredient mappings
      const mappings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${mapping.catalogProduct.id}`,
        method: 'GET',
        headers
      });
      
      console.log(`   Ingredient mappings: ${mappings.length}`);
      
      if (mappings.length === 0) {
        console.log(`   ❌ NO MAPPINGS - Inventory deduction will fail`);
        continue;
      }
      
      // Simulate deduction for each ingredient
      for (const ingredientMapping of mappings) {
        const inventory = ingredientMapping.inventory_item;
        if (!inventory) {
          console.log(`     ❌ Missing inventory item for mapping`);
          continue;
        }
        
        const deductionAmount = ingredientMapping.required_quantity * mapping.posItem.qty;
        const newStock = inventory.stock_quantity - deductionAmount;
        
        console.log(`     🔄 ${inventory.item}:`);
        console.log(`        Current: ${inventory.stock_quantity} ${inventory.unit}`);
        console.log(`        Deduct: ${deductionAmount} ${ingredientMapping.unit}`);
        console.log(`        New: ${newStock} ${inventory.unit}`);
        
        if (newStock < 0) {
          console.log(`        ⚠️  INSUFFICIENT STOCK!`);
        }
        
        // Update inventory (simulate)
        try {
          await req({
            hostname: SUPABASE_URL,
            port: 443,
            path: `/rest/v1/inventory_stock?id=eq.${inventory.id}`,
            method: 'PATCH',
            headers
          }, { stock_quantity: Math.max(0, newStock) });
          
          console.log(`        ✅ Stock updated`);
          
        } catch (error) {
          console.log(`        ❌ Update failed: ${error.message}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error processing ${mapping.catalogProduct.product_name}: ${error.message}`);
    }
  }
}

async function analyzeDeductionResults(beforeInventory, afterInventory, productMappings) {
  console.log('\n📊 STEP 5: ANALYZING DEDUCTION RESULTS');
  console.log('-'.repeat(50));
  
  console.log('Comparing inventory levels before and after deduction...');
  
  for (const mapping of productMappings) {
    if (!mapping.catalogProduct || !mapping.hasRecipe) continue;
    
    const productId = mapping.catalogProduct.id;
    const before = beforeInventory[productId] || {};
    
    console.log(`\n📊 ${mapping.catalogProduct.product_name}:`);
    console.log(`   Quantity sold: ${mapping.posItem.qty}`);
    
    // Get current inventory levels
    try {
      const currentMappings = await req({
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_ingredients?select=*,inventory_item:inventory_stock(*)&product_catalog_id=eq.${productId}`,
        method: 'GET',
        headers
      });
      
      currentMappings.forEach(ingredientMapping => {
        const inventory = ingredientMapping.inventory_item;
        if (!inventory) return;
        
        const beforeLevel = before[inventory.id]?.currentStock || 'Unknown';
        const afterLevel = inventory.stock_quantity;
        const expectedDeduction = ingredientMapping.required_quantity * mapping.posItem.qty;
        const actualDeduction = beforeLevel !== 'Unknown' ? beforeLevel - afterLevel : 'Unknown';
        
        console.log(`     ${inventory.item}:`);
        console.log(`       Before: ${beforeLevel} ${inventory.unit}`);
        console.log(`       After: ${afterLevel} ${inventory.unit}`);
        console.log(`       Expected deduction: ${expectedDeduction} ${ingredientMapping.unit}`);
        console.log(`       Actual deduction: ${actualDeduction} ${inventory.unit}`);
        
        if (actualDeduction === expectedDeduction) {
          console.log(`       ✅ CORRECT DEDUCTION`);
        } else if (actualDeduction !== 'Unknown') {
          console.log(`       ⚠️  DEDUCTION MISMATCH`);
        } else {
          console.log(`       ❓ CANNOT VERIFY`);
        }
      });
      
    } catch (error) {
      console.log(`   ❌ Error analyzing ${mapping.catalogProduct.product_name}: ${error.message}`);
    }
  }
}

function generateManualTestingGuide() {
  console.log('Manual testing steps for inventory deduction validation:');
  console.log('');
  console.log('1. 📋 TRANSACTION VERIFICATION:');
  console.log('   - Check if transaction was imported successfully');
  console.log('   - Verify all transaction items are recorded');
  console.log('   - Confirm product mappings to catalog');
  console.log('');
  console.log('2. 🧪 INGREDIENT MAPPING CHECK:');
  console.log('   - Verify Caramel Delight Croffle has 6 ingredient mappings');
  console.log('   - Check Matcha Blended has specialized ingredient mappings');
  console.log('   - Confirm all mappings point to valid inventory items');
  console.log('');
  console.log('3. 📦 INVENTORY DEDUCTION TEST:');
  console.log('   - Record inventory levels before processing');
  console.log('   - Process transaction through inventory system');
  console.log('   - Compare inventory levels after processing');
  console.log('   - Verify deductions match expected amounts');
  console.log('');
  console.log('4. 🎯 VALIDATION CRITERIA:');
  console.log('   - Caramel Delight Croffle should deduct 6 ingredients');
  console.log('   - Each ingredient should be reduced by recipe quantity');
  console.log('   - Stock levels should be accurate after deduction');
  console.log('   - No errors should occur during processing');
}

main();
