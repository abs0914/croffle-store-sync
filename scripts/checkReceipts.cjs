#!/usr/bin/env node

/**
 * Check inventory deduction for one or more receipts.
 * Usage:
 *   node scripts/checkReceipts.cjs "<receipt1>" "<expected product 1>" ["<receipt2>" "<expected product 2>"] ...
 */

const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
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
          if (!body || body.trim() === '') return resolve(null);
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function authenticateAdmin() {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  };
  const authData = { email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
  const result = await makeRequest(options, authData);
  headers.Authorization = `Bearer ${result.access_token}`;
  return result;
}

async function fetchTransactionByReceipt(receipt) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/transactions?select=*&receipt_number=eq.${encodeURIComponent(receipt)}`,
    method: 'GET',
    headers
  };
  const rows = await makeRequest(options);
  return rows && rows[0];
}

async function fetchItems(transactionId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/transaction_items?select=*&transaction_id=eq.${transactionId}`,
    method: 'GET',
    headers
  };
  return await makeRequest(options);
}

async function fetchRecipeByProductName(name) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_templates?select=*&name=eq.${encodeURIComponent(name)}&is_active=eq.true`,
    method: 'GET',
    headers
  };
  const rows = await makeRequest(options);
  return rows && rows[0];
}

async function fetchIngredients(recipeId) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_template_ingredients?select=*&recipe_template_id=eq.${recipeId}`,
    method: 'GET',
    headers
  };
  return await makeRequest(options);
}

async function fetchInventory(storeId, itemName) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&store_id=eq.${storeId}&item=eq.${encodeURIComponent(itemName)}&is_active=eq.true`,
    method: 'GET',
    headers
  };
  const rows = await makeRequest(options);
  return rows && rows[0];
}

async function fetchMovementsBothTables(transactionId) {
  // Check inventory_transactions
  const txOpts = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_transactions?select=*&reference_id=eq.${transactionId}&order=created_at.desc`,
    method: 'GET',
    headers
  };
  const invTransactions = await makeRequest(txOpts);

  // Check inventory_movements (alternative table used in some paths)
  const mvOpts = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_movements?select=*&reference_id=eq.${transactionId}&order=created_at.desc`,
    method: 'GET',
    headers
  };
  let invMovements = null;
  try {
    invMovements = await makeRequest(mvOpts);
  } catch (e) {
    invMovements = null; // Table may not exist
  }
  return { invTransactions: invTransactions || [], invMovements: invMovements || [] };
}

function fmt(dt) { return dt ? new Date(dt).toISOString() : 'N/A'; }

async function checkReceipt(receipt, expectedProduct) {
  console.log(`\n🔎 Checking Receipt: ${receipt}`);
  const transaction = await fetchTransactionByReceipt(receipt);
  if (!transaction) {
    console.log('❌ Transaction not found');
    return { receipt, ok: false };
  }
  console.log(`   ID: ${transaction.id}`);
  console.log(`   Store: ${transaction.store_id}`);
  console.log(`   Status: ${transaction.status}`);
  console.log(`   Created: ${fmt(transaction.created_at)}`);

  const items = await fetchItems(transaction.id);
  console.log(`   Items (${items?.length || 0}): ${items?.map(i => i.name).join(', ') || '—'}`);

  // Build expected ingredients from expectedProduct, fallback to first item
  const productName = expectedProduct || (items && items[0]?.name);
  if (!productName) {
    console.log('❌ No product name available to derive ingredients');
  }

  let expectedIngredients = [];
  if (productName) {
    const recipe = await fetchRecipeByProductName(productName);
    if (!recipe) {
      console.log(`⚠️  No recipe found for '${productName}'`);
    } else {
      const ingredients = await fetchIngredients(recipe.id);
      const qty = (items || []).find(i => i.name === productName)?.quantity || 1;
      expectedIngredients = (ingredients || []).map(ing => ({
        name: ing.ingredient_name,
        unit: ing.unit,
        totalRequired: ing.quantity * qty
      }));
      console.log(`   Ingredients expected to deduct: ${expectedIngredients.length}`);
    }
  }

  // Check inventory updates timing for each expected ingredient
  let updatedCount = 0;
  for (const ing of expectedIngredients) {
    const stock = await fetchInventory(transaction.store_id, ing.name);
    if (!stock) {
      console.log(`   ❌ Inventory missing: ${ing.name}`);
      continue;
    }
    const wasUpdatedAfter = new Date(stock.updated_at) > new Date(transaction.created_at);
    console.log(`   ${wasUpdatedAfter ? '✅' : '❌'} ${ing.name} updated after tx (expected -${ing.totalRequired} ${ing.unit})`);
    updatedCount += wasUpdatedAfter ? 1 : 0;
  }

  const { invTransactions, invMovements } = await fetchMovementsBothTables(transaction.id);
  const movementsTotal = (invTransactions?.length || 0) + (invMovements?.length || 0);
  console.log(`   Movement records: inventory_transactions=${invTransactions.length}, inventory_movements=${invMovements.length}`);

  const ok = (updatedCount === expectedIngredients.length) && movementsTotal >= expectedIngredients.length;
  return { receipt, ok, updatedCount, expectedCount: expectedIngredients.length, invTransactions, invMovements };
}

(async function main() {
  try {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.length % 2 !== 0) {
      console.log('Usage: node scripts/checkReceipts.cjs "<receipt1>" "<expected product 1>" ["<receipt2>" "<expected product 2>"] ...');
      process.exit(1);
    }
    await authenticateAdmin();

    const results = [];
    for (let i = 0; i < args.length; i += 2) {
      const receipt = args[i];
      const expected = args[i + 1];
      const res = await checkReceipt(receipt, expected);
      results.push(res);
    }

    console.log('\n===== SUMMARY =====');
    for (const r of results) {
      console.log(`• ${r.receipt}: ${r.ok ? '✅ OK' : '❌ ISSUE'} (${r.updatedCount || 0}/${r.expectedCount || 0} ingredients updated, movements tx:${r.invTransactions?.length || 0} mv:${r.invMovements?.length || 0})`);
    }
  } catch (e) {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  }
})();

