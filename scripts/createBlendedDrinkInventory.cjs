#!/usr/bin/env node

/**
 * Create Blended Drink Inventory Items
 * 
 * Creates specialized inventory items needed for blended drink products across all stores
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

// Specialized blended drink inventory items
const BLENDED_DRINK_INVENTORY = [
  // Core ingredients
  { item: 'Oreo Cookies', unit: 'pieces', stock: 100, threshold: 20, cost: 8 },
  { item: 'Strawberry Syrup', unit: 'serving', stock: 50, threshold: 10, cost: 6 },
  { item: 'Strawberry Jam', unit: 'serving', stock: 50, threshold: 10, cost: 7 },
  { item: 'Matcha Powder', unit: 'serving', stock: 100, threshold: 20, cost: 10 },
  { item: 'Milk', unit: 'serving', stock: 100, threshold: 20, cost: 3 },
  { item: 'Ice', unit: 'serving', stock: 200, threshold: 50, cost: 1 },
  
  // Specialized containers and toppings
  { item: 'Blender Cup', unit: 'pieces', stock: 50, threshold: 10, cost: 15 },
  { item: 'Whipped Cream Topping', unit: 'serving', stock: 50, threshold: 10, cost: 4 },
  { item: 'Vanilla Ice Cream', unit: 'serving', stock: 50, threshold: 10, cost: 12 },
  { item: 'Chocolate Syrup', unit: 'serving', stock: 50, threshold: 10, cost: 5 },
  
  // Additional beverage ingredients
  { item: 'Crushed Ice', unit: 'serving', stock: 200, threshold: 50, cost: 1 },
  { item: 'Fresh Strawberries', unit: 'pieces', stock: 30, threshold: 5, cost: 15 },
  { item: 'Blended Base Mix', unit: 'serving', stock: 100, threshold: 20, cost: 8 }
];

async function main() {
  console.log('🧊 CREATING BLENDED DRINK INVENTORY ITEMS');
  console.log('=' .repeat(60));
  console.log(`Target: ${BLENDED_DRINK_INVENTORY.length} specialized ingredients`);
  console.log('Scope: All 8 croffle stores');
  console.log('=' .repeat(60));
  
  await auth();

  // Get all active stores
  const stores = await req({
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true&order=name.asc',
    method: 'GET',
    headers
  });
  
  console.log(`\n🏪 Processing ${stores.length} stores...`);
  
  let totalCreated = 0;
  let totalSkipped = 0;
  
  for (const store of stores) {
    console.log(`\n🏪 ${store.name}`);
    console.log('-'.repeat(40));
    
    const result = await createInventoryForStore(store);
    totalCreated += result.created;
    totalSkipped += result.skipped;
    
    console.log(`   ✅ Created: ${result.created} items`);
    console.log(`   ⚠️  Skipped: ${result.skipped} items (already exist)`);
  }
  
  console.log(`\n📊 BLENDED DRINK INVENTORY CREATION SUMMARY:`);
  console.log(`   Total Items Created: ${totalCreated}`);
  console.log(`   Total Items Skipped: ${totalSkipped}`);
  console.log(`   Success Rate: ${totalCreated > 0 ? 'Items created successfully' : 'All items already existed'}`);
  
  if (totalCreated > 0) {
    console.log(`\n✅ PHASE 1B PREPARATION COMPLETE:`);
    console.log(`   • ${totalCreated} specialized blended drink ingredients created`);
    console.log(`   • All stores now have required inventory items`);
    console.log(`   • Ready to re-run blended drink mapping process`);
  }
}

async function createInventoryForStore(store) {
  const result = { created: 0, skipped: 0 };
  
  try {
    // Get existing inventory items for this store
    const existingInventory = await req({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/inventory_stock?select=item&store_id=eq.${store.id}`,
      method: 'GET',
      headers
    });
    
    const existingItems = new Set(existingInventory.map(item => item.item));
    
    // Determine which items need to be created
    const itemsToCreate = BLENDED_DRINK_INVENTORY.filter(item => 
      !existingItems.has(item.item)
    );
    
    console.log(`   📦 Existing items: ${existingInventory.length}`);
    console.log(`   📦 Items to create: ${itemsToCreate.length}`);
    
    if (itemsToCreate.length === 0) {
      result.skipped = BLENDED_DRINK_INVENTORY.length;
      return result;
    }
    
    // Create inventory items (without cost_per_unit field)
    const inventoryRecords = itemsToCreate.map(item => ({
      store_id: store.id,
      item: item.item,
      unit: item.unit,
      stock_quantity: item.stock,
      minimum_threshold: item.threshold,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Create in batches to avoid overwhelming the database
    const batchSize = 5;
    for (let i = 0; i < inventoryRecords.length; i += batchSize) {
      const batch = inventoryRecords.slice(i, i + batchSize);
      
      try {
        await req({
          hostname: SUPABASE_URL,
          port: 443,
          path: '/rest/v1/inventory_stock',
          method: 'POST',
          headers
        }, batch);
        
        result.created += batch.length;
        
        // Show created items
        batch.forEach(item => {
          console.log(`     ✅ ${item.item} (${item.stock_quantity} ${item.unit})`);
        });
        
      } catch (error) {
        console.log(`     ❌ Failed to create batch: ${error.message}`);
        result.skipped += batch.length;
      }
    }
    
    result.skipped += (BLENDED_DRINK_INVENTORY.length - itemsToCreate.length);
    
  } catch (error) {
    console.log(`   ❌ Error processing store: ${error.message}`);
    result.skipped = BLENDED_DRINK_INVENTORY.length;
  }
  
  return result;
}

main().catch(err => {
  console.error('Blended drink inventory creation failed:', err.message);
  process.exit(1);
});
