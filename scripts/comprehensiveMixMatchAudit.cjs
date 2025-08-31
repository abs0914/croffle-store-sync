#!/usr/bin/env node
/**
 * Comprehensive Mix & Match Inventory Deduction Investigation
 * Analyzes the complete flow from POS → transaction → inventory deduction
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

function req(opts) {
  return new Promise((resolve, reject) => {
    const resChunks = [];
    const r = https.request(opts, (res) => {
      res.on('data', (d) => resChunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(resChunks).toString('utf8');
        if (!body.trim()) return resolve(null);
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    r.on('error', reject); r.end();
  });
}

async function getTransaction(receipt) {
  const path = `/rest/v1/transactions?select=*&receipt_number=eq.${encodeURIComponent(receipt)}`;
  const rows = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  return rows && rows[0];
}

async function getTransactionItems(txId) {
  const path = `/rest/v1/transaction_items?select=*&transaction_id=eq.${txId}&order=created_at.desc`;
  return await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
}

async function getInventoryTransactions(txId) {
  const path = `/rest/v1/inventory_transactions?select=*&reference_id=eq.${txId}&order=created_at.desc`;
  return await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
}

async function getProductCatalog(productId) {
  const path = `/rest/v1/product_catalog?select=*&id=eq.${productId}`;
  const rows = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  return rows && rows[0];
}

async function getRecipeTemplate(templateId) {
  const path = `/rest/v1/recipe_templates?select=*&id=eq.${templateId}`;
  const rows = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  return rows && rows[0];
}

async function getRecipeTemplateIngredients(templateId) {
  const path = `/rest/v1/recipe_template_ingredients?select=*&recipe_template_id=eq.${templateId}`;
  return await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
}

async function getInventoryStockById(id) {
  const path = `/rest/v1/inventory_stock?id=eq.${id}`;
  const rows = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  return rows && rows[0];
}

async function findMixMatchProducts() {
  const path = `/rest/v1/product_catalog?select=id,product_name,recipe_id,store_id&product_name=ilike.%croffle overload%,product_name=ilike.%mini croffle%&is_available=eq.true`;
  return await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
}

(async function main() {
  const receipt = process.argv[2];
  if (!receipt) {
    console.log('Usage: node scripts/comprehensiveMixMatchAudit.cjs "<receipt>"');
    process.exit(1);
  }

  console.log('🔍 COMPREHENSIVE MIX & MATCH INVENTORY DEDUCTION INVESTIGATION');
  console.log('='.repeat(80));

  // Step 1: Get transaction details
  console.log('\n📋 STEP 1: TRANSACTION ANALYSIS');
  console.log('-'.repeat(50));
  
  const tx = await getTransaction(receipt);
  if (!tx) {
    console.log('❌ Transaction not found');
    process.exit(0);
  }
  
  console.log(`Transaction: ${tx.id}`);
  console.log(`Store: ${tx.store_id}`);
  console.log(`Status: ${tx.status}`);
  console.log(`Created: ${tx.created_at}`);
  console.log(`Items in transaction.items: ${tx.items ? tx.items.length : 'null'}`);
  
  if (tx.items) {
    console.log('\nTransaction items from JSON:');
    tx.items.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} (qty: ${item.quantity})`);
      if (item.productId) console.log(`     Product ID: ${item.productId}`);
    });
  }

  // Step 2: Get transaction_items table entries
  console.log('\n📦 STEP 2: TRANSACTION_ITEMS TABLE ANALYSIS');
  console.log('-'.repeat(50));
  
  const txItems = await getTransactionItems(tx.id);
  console.log(`Transaction items in table: ${(txItems || []).length}`);
  
  if (txItems && txItems.length > 0) {
    for (const item of txItems) {
      console.log(`\n  Item: ${item.name}`);
      console.log(`    Product ID: ${item.product_id || 'null'}`);
      console.log(`    Quantity: ${item.quantity}`);
      console.log(`    Type: ${item.product_type || 'unknown'}`);
      
      // Check if this is a Mix & Match item
      const isMixMatch = item.name.toLowerCase().includes('with ') || 
                        item.name.toLowerCase().includes('croffle overload') ||
                        item.name.toLowerCase().includes('mini croffle');
      
      if (isMixMatch) {
        console.log(`    🎯 IDENTIFIED AS MIX & MATCH ITEM`);
        
        // Check product catalog mapping
        if (item.product_id) {
          const product = await getProductCatalog(item.product_id);
          if (product) {
            console.log(`    Product Catalog: ${product.product_name}`);
            console.log(`    Recipe ID: ${product.recipe_id || 'null'}`);
            
            if (product.recipe_id) {
              // Check if recipe links to template
              const path = `/rest/v1/recipes?select=template_id&id=eq.${product.recipe_id}`;
              const recipeRows = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
              const recipe = recipeRows && recipeRows[0];
              
              if (recipe && recipe.template_id) {
                console.log(`    Template ID: ${recipe.template_id}`);
                
                const template = await getRecipeTemplate(recipe.template_id);
                if (template) {
                  console.log(`    Template Name: ${template.name}`);
                  
                  const ingredients = await getRecipeTemplateIngredients(recipe.template_id);
                  console.log(`    Base Ingredients: ${(ingredients || []).length}`);
                  if (ingredients) {
                    ingredients.forEach(ing => {
                      console.log(`      - ${ing.ingredient_name} (${ing.quantity} ${ing.unit})`);
                    });
                  }
                }
              } else {
                console.log(`    ❌ No template_id found in recipes table`);
              }
            } else {
              console.log(`    ❌ No recipe_id in product_catalog`);
            }
          } else {
            console.log(`    ❌ Product not found in catalog`);
          }
        }
      }
    }
  }

  // Step 3: Inventory deduction analysis
  console.log('\n🔄 STEP 3: INVENTORY DEDUCTION ANALYSIS');
  console.log('-'.repeat(50));
  
  const invTxs = await getInventoryTransactions(tx.id);
  console.log(`Inventory transactions: ${(invTxs || []).length}`);
  
  const deductedItems = new Map();
  
  if (invTxs && invTxs.length > 0) {
    console.log('\nDeducted items:');
    for (const invTx of invTxs) {
      const stock = invTx.product_id ? await getInventoryStockById(invTx.product_id) : null;
      const itemName = stock?.item || invTx.item || invTx.item_name || '(unknown)';
      
      if (!deductedItems.has(itemName)) {
        deductedItems.set(itemName, 0);
      }
      deductedItems.set(itemName, deductedItems.get(itemName) + Math.abs(invTx.quantity || 0));
      
      console.log(`  - ${itemName}: ${invTx.quantity} (${invTx.previous_quantity} → ${invTx.new_quantity})`);
    }
  }

  // Step 4: Mix & Match base product analysis
  console.log('\n🎯 STEP 4: MIX & MATCH BASE PRODUCT ANALYSIS');
  console.log('-'.repeat(50));
  
  const mixMatchProducts = await findMixMatchProducts();
  console.log(`Mix & Match base products found: ${(mixMatchProducts || []).length}`);
  
  if (mixMatchProducts) {
    for (const product of mixMatchProducts) {
      console.log(`\n  Base Product: ${product.product_name}`);
      console.log(`    ID: ${product.id}`);
      console.log(`    Recipe ID: ${product.recipe_id || 'null'}`);
      
      if (product.recipe_id) {
        // Check recipe → template mapping
        const path = `/rest/v1/recipes?select=template_id&id=eq.${product.recipe_id}`;
        const recipeRows = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
        const recipe = recipeRows && recipeRows[0];
        
        if (recipe && recipe.template_id) {
          const template = await getRecipeTemplate(recipe.template_id);
          if (template) {
            console.log(`    Template: ${template.name}`);
            
            const ingredients = await getRecipeTemplateIngredients(recipe.template_id);
            if (ingredients && ingredients.length > 0) {
              console.log(`    Base ingredients (${ingredients.length}):`);
              ingredients.forEach(ing => {
                const wasDeducted = deductedItems.has(ing.ingredient_name);
                console.log(`      ${wasDeducted ? '✅' : '❌'} ${ing.ingredient_name} (${ing.quantity} ${ing.unit})`);
              });
            }
          }
        }
      }
    }
  }

  // Step 5: Root cause analysis
  console.log('\n🔬 STEP 5: ROOT CAUSE ANALYSIS');
  console.log('-'.repeat(50));
  
  console.log('\nKey findings:');
  
  // Check if Mix & Match items have proper product_id mapping
  const mixMatchItemsInTx = (txItems || []).filter(item => 
    item.name.toLowerCase().includes('with ') || 
    item.name.toLowerCase().includes('croffle overload') ||
    item.name.toLowerCase().includes('mini croffle')
  );
  
  console.log(`1. Mix & Match items in transaction: ${mixMatchItemsInTx.length}`);
  
  const itemsWithProductId = mixMatchItemsInTx.filter(item => item.product_id);
  console.log(`2. Mix & Match items with product_id: ${itemsWithProductId.length}`);
  
  const itemsWithRecipeId = [];
  for (const item of itemsWithProductId) {
    const product = await getProductCatalog(item.product_id);
    if (product && product.recipe_id) {
      itemsWithRecipeId.push(item);
    }
  }
  console.log(`3. Mix & Match items with recipe_id: ${itemsWithRecipeId.length}`);
  
  console.log('\n📊 SUMMARY:');
  if (mixMatchItemsInTx.length === 0) {
    console.log('❌ No Mix & Match items found in transaction');
  } else if (itemsWithProductId.length === 0) {
    console.log('❌ Mix & Match items missing product_id - cannot resolve base recipes');
  } else if (itemsWithRecipeId.length === 0) {
    console.log('❌ Mix & Match products missing recipe_id - base ingredients not linked');
  } else {
    console.log('✅ Mix & Match items properly linked to recipes');
    console.log('🔍 Check inventory deduction service logs for processing details');
  }
})();
