#!/usr/bin/env node

/**
 * Controlled POS test transaction (creates real records in the dev DB)
 * Steps:
 * 1) Auth as admin
 * 2) Find product_catalog by name (arg 1) and pick a store
 * 3) Capture pre-inventory for linked product_ingredients
 * 4) Create a transactions row (status=completed) and transaction_items
 * 5) Perform inventory deduction based on product_ingredients (quantity=1 by default)
 * 6) Insert movement records (inventory_transactions, fallback to inventory_movements)
 * 7) Validate and print summary
 *
 * Usage:
 *   node scripts/runControlledPosTest.cjs "Caramel Delight Croffle" [quantity]
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

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          if (!body || body.trim() === '') return resolve(null);
          const json = JSON.parse(body);
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${json.message || body}`));
          resolve(json);
        } catch (e) { reject(new Error(`Parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function auth() {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY }
  };
  const res = await request(options, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  headers.Authorization = `Bearer ${res.access_token}`;
  return res;
}

async function findProductByName(name) {
  // Try exact match first
  let options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,store_id,product_name,price,recipe_id&product_name=eq.${encodeURIComponent(name)}&is_available=eq.true`,
    method: 'GET',
    headers
  };
  let rows = await request(options);
  if (rows && rows[0]) return rows[0];

  // Fallback to ilike match (normalize spaces)
  const normalized = name.trim().replace(/\s+/g, ' ');
  const pattern = `*${encodeURIComponent(normalized)}*`;
  options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,store_id,product_name,price,recipe_id&product_name=ilike.${pattern}&is_available=eq.true&limit=10`,
    method: 'GET',
    headers
  };
  rows = await request(options);
  if (rows && rows.length) {
    // Choose exact normalized name if present, otherwise first result
    const norm = (s) => (s||'').trim().replace(/\s+/g, ' ').toLowerCase();
    const exact = rows.find(r => norm(r.product_name) === norm(normalized));
    return exact || rows[0];
  }
  return null;
}

async function fetchProductIngredients(productCatalogId) {
  // Prefer product_ingredients mapping if present
  let options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_ingredients?select=inventory_item:inventory_stock(id,item,unit,stock_quantity,is_active),required_quantity,unit&product_catalog_id=eq.${productCatalogId}`,
    method: 'GET',
    headers
  };
  let rows = await request(options);
  if (rows && rows.length) return rows;

  // Fallback: resolve via recipe template ingredients
  options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=recipe_id&id=eq.${productCatalogId}`,
    method: 'GET',
    headers
  };
  const cat = await request(options);
  const recipeId = cat && cat[0] && cat[0].recipe_id;
  if (!recipeId) return [];

  options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipes?select=template_id&id=eq.${recipeId}`,
    method: 'GET',
    headers
  };
  const rec = await request(options);
  const templateId = rec && rec[0] && rec[0].template_id;
  if (!templateId) return [];

  options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/recipe_template_ingredients?select=ingredient_name,quantity,unit&recipe_template_id=eq.${templateId}`,
    method: 'GET',
    headers
  };
  const templIngs = await request(options);

  // Map to shape similar to product_ingredients output
  const out = [];
  for (const ing of (templIngs || [])) {
    // Try to find inventory by item name
    const invOpts = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/inventory_stock?select=id,item,unit,stock_quantity,is_active&item=eq.${encodeURIComponent(ing.ingredient_name)}`,
      method: 'GET',
      headers
    };
    const inv = await request(invOpts);
    const inventory_item = inv && inv[0] || null;
    out.push({ inventory_item, required_quantity: ing.quantity, unit: ing.unit });
  }
  return out;
}

async function fetchInventoryById(id) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?select=*&id=eq.${id}`,
    method: 'GET',
    headers
  };
  const rows = await request(options);
  return rows && rows[0];
}

async function insertTransaction(storeId, items, total) {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const receipt = `TEST-${ts}-${Math.floor(Math.random()*9000+1000)}`;
  const tx = {
    shift_id: storeId,
    store_id: storeId,
    user_id: storeId,
    items: JSON.stringify(items),
    subtotal: total,
    tax: 0,
    discount: 0,
    total: total,
    amount_tendered: total,
    change: 0,
    payment_method: 'cash',
    status: 'completed',
    receipt_number: receipt,
    created_at: new Date().toISOString()
  };
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/transactions`,
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' }
  };
  const rows = await request(options, tx);
  return rows && rows[0];
}

async function insertTransactionItem(transactionId, product) {
  const item = {
    transaction_id: transactionId,
    product_id: product.id,
    name: product.name,
    quantity: product.quantity,
    unit_price: product.price,
    total_price: product.price * product.quantity,
    product_type: 'direct'
  };
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/transaction_items`,
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' }
  };
  return await request(options, item);
}

async function updateInventoryStock(id, newQty) {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_stock?id=eq.${id}`,
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' }
  };
  return await request(options, { stock_quantity: newQty, updated_at: new Date().toISOString() });
}

async function insertMovement(inventoryId, storeId, delta, prev, next, transactionId, itemName, createdBy) {
  // Primary table: inventory_transactions (schema uses product_id=inventory_stock.id)
  const payload = {
    store_id: storeId,
    product_id: inventoryId,
    transaction_type: 'sale',
    quantity: delta,
    previous_quantity: prev,
    new_quantity: next,
    reference_id: transactionId,
    notes: `Controlled POS test: ${itemName}`,
    created_by: createdBy,
    created_at: new Date().toISOString()
  };
  try {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/inventory_transactions`,
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' }
    };
    return await request(options, payload);
  } catch (e) {
    // Fallback to inventory_movements
    const mv = {
      inventory_stock_id: inventoryId,
      movement_type: 'sale',
      quantity_change: delta,
      previous_quantity: prev,
      new_quantity: next,
      reference_type: 'transaction',
      reference_id: transactionId,
      notes: `Controlled POS test: ${itemName}`,
      created_at: new Date().toISOString()
    };
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/inventory_movements`,
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' }
    };
    return await request(options, mv);
  }
}

async function fetchMovements(transactionId) {
  const options1 = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_transactions?select=*&reference_id=eq.${transactionId}`,
    method: 'GET',
    headers
  };
  const options2 = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/inventory_movements?select=*&reference_id=eq.${transactionId}`,
    method: 'GET',
    headers
  };
  const [a, b] = await Promise.all([request(options1), request(options2).catch(()=>[])]);
  return { inventory_transactions: a || [], inventory_movements: b || [] };
}

(async function main() {
  try {
    const args = process.argv.slice(2);
    const name = args[0] || 'Caramel Delight Croffle';
    const qty = parseInt(args[1] || '1', 10);

    console.log('🔬 Controlled POS Test');
    console.log('- Product:', name);
    console.log('- Quantity:', qty);

    const authRes = await auth();
    const createdBy = authRes.user && (authRes.user.id || authRes.user.email) || 'system';

    const product = await findProductByName(name);
    if (!product) throw new Error('Product not found in product_catalog');
    console.log('✅ Product:', product.product_name, 'Store:', product.store_id, 'Price:', product.price);

    const ingredients = await fetchProductIngredients(product.id);
    if (!ingredients || ingredients.length === 0) throw new Error('No product_ingredients found for this product');

    // Capture pre-inventory
    const pre = [];
    for (const ing of ingredients) {
      if (!ing.inventory_item) continue;
      pre.push({ id: ing.inventory_item.id, name: ing.inventory_item.item, unit: ing.unit, required: ing.required_quantity * qty, stock: ing.inventory_item.stock_quantity });
    }
    console.log('📦 Ingredients:', pre.map(p => `${p.name} need ${p.required} ${p.unit} (have ${p.stock})`).join('; '));

    // Create transaction
    const txItems = [{ productId: product.id, name: product.product_name, quantity: qty, unitPrice: product.price, totalPrice: product.price * qty }];
    const tx = await insertTransaction(product.store_id, txItems, product.price * qty);
    if (!tx) throw new Error('Failed to create transaction');
    console.log('🧾 Transaction created:', tx.id, tx.receipt_number);

    await insertTransactionItem(tx.id, { id: product.id, name: product.product_name, quantity: qty, price: product.price });

    // Deduct inventory and record movements
    let successCount = 0;
    for (const p of pre) {
      const newQty = Math.max(0, Number(p.stock) - Number(p.required));
      await updateInventoryStock(p.id, newQty);
      await insertMovement(p.id, product.store_id, -Number(p.required), Number(p.stock), newQty, tx.id, p.name, createdBy);
      successCount++;
    }

    // Validate
    const post = [];
    for (const p of pre) {
      const now = await fetchInventoryById(p.id);
      post.push({ ...p, newStock: now?.stock_quantity, updated_at: now?.updated_at });
    }

    const movements = await fetchMovements(tx.id);

    console.log('\n===== RESULTS =====');
    post.forEach((p) => console.log(`• ${p.name}: ${p.stock} -> ${p.newStock} (deducted ${p.required})`));
    console.log(`Movement records: inventory_transactions=${movements.inventory_transactions.length}, inventory_movements=${movements.inventory_movements.length}`);

    console.log('\n✅ Controlled POS test complete.');
  } catch (e) {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  }
})();

