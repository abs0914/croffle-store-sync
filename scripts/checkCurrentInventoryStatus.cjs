#!/usr/bin/env node

/**
 * Check Current Inventory Status
 * 
 * This script checks the current inventory status to verify our fixes.
 */

const https = require('https');

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
          if (body.trim() === '') {
            resolve(null);
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
            } else {
              resolve(result);
            }
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function authenticateAdmin() {
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  const authResult = await makeRequest(authOptions, authData);
  headers.Authorization = `Bearer ${authResult.access_token}`;
  console.log('✅ Admin authenticated successfully');
  return authResult;
}

async function main() {
  try {
    console.log('📊 CHECKING CURRENT INVENTORY STATUS');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Check inventory quantities
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_stock?select=store_id,item,stock_quantity,unit&is_active=eq.true&order=store_id,item&limit=20',
      method: 'GET',
      headers
    };
    
    const inventory = await makeRequest(inventoryOptions);
    
    if (inventory && inventory.length > 0) {
      // Group by store
      const inventoryByStore = {};
      inventory.forEach(item => {
        if (!inventoryByStore[item.store_id]) {
          inventoryByStore[item.store_id] = [];
        }
        inventoryByStore[item.store_id].push(item);
      });
      
      console.log(`✅ Current inventory status (showing first 20 items):`);
      
      // Check quantities
      const quantities = inventory.map(item => item.stock_quantity);
      const uniqueQuantities = [...new Set(quantities)];
      
      console.log(`\n📊 QUANTITY SUMMARY:`);
      console.log(`   Total items checked: ${quantities.length}`);
      console.log(`   Unique quantities: ${uniqueQuantities.join(', ')}`);
      
      // Count by quantity
      const quantityCounts = {};
      quantities.forEach(qty => {
        quantityCounts[qty] = (quantityCounts[qty] || 0) + 1;
      });
      
      console.log(`\n📈 QUANTITY DISTRIBUTION:`);
      Object.entries(quantityCounts).forEach(([qty, count]) => {
        const status = qty === '100' ? '✅' : qty === '49' ? '🔄' : '⚠️';
        console.log(`   ${status} ${qty} units: ${count} items`);
      });
      
      // Show sample items by store
      console.log(`\n🏪 SAMPLE INVENTORY BY STORE:`);
      Object.entries(inventoryByStore).slice(0, 2).forEach(([storeId, items]) => {
        console.log(`\n   Store ${storeId}:`);
        items.slice(0, 5).forEach(item => {
          const status = item.stock_quantity === 100 ? '✅' : item.stock_quantity === 49 ? '🔄' : '⚠️';
          console.log(`      ${status} ${item.item}: ${item.stock_quantity} ${item.unit}`);
        });
        if (items.length > 5) {
          console.log(`      ... and ${items.length - 5} more items`);
        }
      });
      
      // Check specific items for Choco Marshmallow Croffle
      console.log(`\n🧪 CHOCO MARSHMALLOW CROFFLE INGREDIENTS:`);
      const chocoIngredients = ['Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Marshmallow', 'Chopstick', 'Wax Paper'];
      
      for (const ingredient of chocoIngredients) {
        const items = inventory.filter(item => item.item === ingredient);
        if (items.length > 0) {
          const quantities = items.map(item => item.stock_quantity);
          const uniqueQtys = [...new Set(quantities)];
          console.log(`   ${ingredient}: ${uniqueQtys.join(', ')} (${items.length} stores)`);
        } else {
          console.log(`   ${ingredient}: NOT FOUND`);
        }
      }
      
    } else {
      console.log('❌ No inventory found');
    }
    
    // Check recent transactions
    console.log(`\n📝 RECENT TRANSACTIONS:`);
    const transactionsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/transactions?select=id,receipt_number,total,status,created_at&order=created_at.desc&limit=5',
      method: 'GET',
      headers
    };
    
    const transactions = await makeRequest(transactionsOptions);
    
    if (transactions && transactions.length > 0) {
      transactions.forEach((txn, index) => {
        console.log(`   ${index + 1}. ${txn.receipt_number}: ₱${txn.total} (${txn.status})`);
      });
    } else {
      console.log('   No recent transactions found');
    }
    
    // Check inventory movements
    console.log(`\n📊 RECENT INVENTORY MOVEMENTS:`);
    const movementsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_transactions?select=item,transaction_type,quantity,created_at&order=created_at.desc&limit=5',
      method: 'GET',
      headers
    };
    
    const movements = await makeRequest(movementsOptions);
    
    if (movements && movements.length > 0) {
      movements.forEach((movement, index) => {
        console.log(`   ${index + 1}. ${movement.item || movement.item_name}: ${movement.quantity} (${movement.transaction_type})`);
      });
    } else {
      console.log('   No recent inventory movements found');
    }
    
    console.log(`\n🎯 STATUS SUMMARY:`);
    if (uniqueQuantities.includes(100)) {
      console.log('✅ Inventory quantities have been updated to 100');
    }
    if (uniqueQuantities.includes(49)) {
      console.log('🔄 Some items show 49, indicating recent transactions');
    }
    if (movements && movements.length > 0) {
      console.log('✅ Inventory movements are being recorded');
    } else {
      console.log('⚠️  No inventory movements found - deduction system may not be active');
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    process.exit(1);
  }
}

main();
