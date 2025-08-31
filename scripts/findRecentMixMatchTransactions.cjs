#!/usr/bin/env node
/**
 * Find recent Mix & Match transactions for analysis
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

async function getRecentTransactions() {
  const path = `/rest/v1/transactions?select=*&order=created_at.desc&limit=20`;
  return await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
}

async function analyzeProductCatalogMixMatch() {
  console.log('\n🎯 MIX & MATCH PRODUCT CATALOG ANALYSIS');
  console.log('-'.repeat(50));
  
  // Find Mix & Match base products
  const path = `/rest/v1/product_catalog?select=id,product_name,recipe_id,store_id&or=(product_name.ilike.%croffle overload%,product_name.ilike.%mini croffle%)&is_available=eq.true`;
  const products = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  
  console.log(`Mix & Match base products: ${(products || []).length}`);
  
  if (products) {
    for (const product of products) {
      console.log(`\n  ${product.product_name}`);
      console.log(`    ID: ${product.id}`);
      console.log(`    Recipe ID: ${product.recipe_id || 'null'}`);
      
      if (product.recipe_id) {
        // Check recipe → template mapping
        const recipePath = `/rest/v1/recipes?select=template_id,name&id=eq.${product.recipe_id}`;
        const recipeRows = await req({ hostname: SUPABASE_URL, port: 443, path: recipePath, method: 'GET', headers });
        const recipe = recipeRows && recipeRows[0];
        
        if (recipe && recipe.template_id) {
          console.log(`    ✅ Template ID: ${recipe.template_id}`);
          
          // Get template ingredients
          const templatePath = `/rest/v1/recipe_template_ingredients?select=ingredient_name,quantity,unit&recipe_template_id=eq.${recipe.template_id}`;
          const ingredients = await req({ hostname: SUPABASE_URL, port: 443, path: templatePath, method: 'GET', headers });
          
          if (ingredients && ingredients.length > 0) {
            console.log(`    Base ingredients (${ingredients.length}):`);
            ingredients.forEach(ing => {
              console.log(`      - ${ing.ingredient_name} (${ing.quantity} ${ing.unit})`);
            });
          } else {
            console.log(`    ❌ No ingredients found for template`);
          }
        } else {
          console.log(`    ❌ No template_id found`);
        }
      } else {
        console.log(`    ❌ No recipe_id - base ingredients not linked`);
      }
    }
  }
}

(async function main() {
  console.log('🔍 FINDING RECENT MIX & MATCH TRANSACTIONS');
  console.log('='.repeat(60));

  const transactions = await getRecentTransactions();
  console.log(`Recent transactions: ${(transactions || []).length}`);
  
  const mixMatchTransactions = [];
  
  if (transactions) {
    for (const tx of transactions) {
      if (tx.items && Array.isArray(tx.items)) {
        const hasMixMatch = tx.items.some(item => 
          item.name && (
            item.name.toLowerCase().includes('with ') ||
            item.name.toLowerCase().includes('croffle overload') ||
            item.name.toLowerCase().includes('mini croffle')
          )
        );
        
        if (hasMixMatch) {
          mixMatchTransactions.push(tx);
        }
      }
    }
  }
  
  console.log(`\nMix & Match transactions found: ${mixMatchTransactions.length}`);
  
  if (mixMatchTransactions.length > 0) {
    console.log('\nRecent Mix & Match transactions:');
    mixMatchTransactions.slice(0, 5).forEach((tx, i) => {
      console.log(`\n${i + 1}. Receipt: ${tx.receipt_number}`);
      console.log(`   ID: ${tx.id}`);
      console.log(`   Created: ${tx.created_at}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Items:`);
      
      tx.items.forEach(item => {
        const isMixMatch = item.name && (
          item.name.toLowerCase().includes('with ') ||
          item.name.toLowerCase().includes('croffle overload') ||
          item.name.toLowerCase().includes('mini croffle')
        );
        
        console.log(`     ${isMixMatch ? '🎯' : '  '} ${item.name} (qty: ${item.quantity})`);
        if (item.productId) console.log(`        Product ID: ${item.productId}`);
      });
    });
    
    console.log(`\n📋 To analyze a specific transaction, run:`);
    console.log(`node scripts/comprehensiveMixMatchAudit.cjs "${mixMatchTransactions[0].receipt_number}"`);
  }
  
  // Analyze product catalog setup
  await analyzeProductCatalogMixMatch();
})();
