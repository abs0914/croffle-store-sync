#!/usr/bin/env node
/**
 * Print inventory movement details for a given receipt number
 * Usage: node scripts/printMovementsForReceipt.cjs "<receipt_number>"
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

async function getInventoryTransactions(txId) {
  const path = `/rest/v1/inventory_transactions?select=*&reference_id=eq.${txId}&order=created_at.desc`;
  return await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
}

async function getInventoryMovements(txId) {
  const path = `/rest/v1/inventory_movements?select=*&reference_id=eq.${txId}&order=created_at.desc`;
  try { return await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers }); } catch { return []; }
}

async function getInventoryStockById(id) {
  const path = `/rest/v1/inventory_stock?id=eq.${id}`;
  const rows = await req({ hostname: SUPABASE_URL, port: 443, path, method: 'GET', headers });
  return rows && rows[0];
}

(async function main() {
  const receipt = process.argv[2];
  if (!receipt) { console.log('Usage: node scripts/printMovementsForReceipt.cjs "<receipt>"'); process.exit(1); }

  const tx = await getTransaction(receipt);
  if (!tx) { console.log('❌ Transaction not found'); process.exit(0); }
  console.log(`Transaction: ${tx.id} | store: ${tx.store_id} | created: ${tx.created_at}`);

  const [txRows, mvRows] = await Promise.all([
    getInventoryTransactions(tx.id),
    getInventoryMovements(tx.id),
  ]);

  console.log(`\nInventory Transactions (${(txRows||[]).length}):`);
  if (txRows && txRows.length) {
    for (const r of txRows) {
      const stock = r.product_id ? await getInventoryStockById(r.product_id) : null;
      const name = r.item || r.item_name || stock?.item || '(unknown)';
      console.log(`- ${name} | qty: ${r.quantity} | prev: ${r.previous_quantity} -> ${r.new_quantity}`);
    }
  }

  console.log(`\nInventory Movements (${(mvRows||[]).length}):`);
  if (mvRows && mvRows.length) {
    for (const r of mvRows) {
      const stock = r.inventory_stock_id ? await getInventoryStockById(r.inventory_stock_id) : null;
      const name = r.item || r.item_name || stock?.item || '(unknown)';
      console.log(`- ${name} | change: ${r.quantity_change} | prev: ${r.previous_quantity} -> ${r.new_quantity}`);
    }
  }
})();

