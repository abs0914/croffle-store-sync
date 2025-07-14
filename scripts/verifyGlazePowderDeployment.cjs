#!/usr/bin/env node

/**
 * Verify Glaze Powder Deployment
 * 
 * This script verifies that Glaze Powder has been successfully deployed
 * to all stores in the croffle-store-sync system.
 */

const https = require('https');

// Configuration
const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

let accessToken = null;

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Authenticate as admin
async function authenticateAdmin() {
  console.log('🔐 Authenticating as admin...');
  
  const authOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }
  };
  
  const authData = {
    email: 'admin@example.com',
    password: 'password123'
  };
  
  try {
    const result = await makeRequest(authOptions, authData);
    accessToken = result.access_token;
    
    // Update headers with access token
    headers['Authorization'] = `Bearer ${accessToken}`;
    
    console.log('✅ Admin authentication successful');
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.message);
    throw error;
  }
}

async function verifyGlazePowderDeployment() {
  try {
    console.log("🔍 Verifying Glaze Powder deployment...");
    console.log('='.repeat(50));

    await authenticateAdmin();

    // Get all active stores
    console.log('\n📋 STEP 1: GETTING ALL ACTIVE STORES');
    console.log('-'.repeat(40));
    
    const storesOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/stores?select=id,name&is_active=eq.true',
      method: 'GET',
      headers
    };

    const stores = await makeRequest(storesOptions);
    console.log(`✅ Found ${stores.length} active stores`);

    // Get all Glaze Powder inventory
    console.log('\n🔍 STEP 2: CHECKING GLAZE POWDER INVENTORY');
    console.log('-'.repeat(40));
    
    const inventoryOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/inventory_stock?select=*&item=eq.Glaze%20Powder',
      method: 'GET',
      headers
    };

    const glazePowderInventory = await makeRequest(inventoryOptions);
    
    console.log(`📦 Found ${glazePowderInventory.length} Glaze Powder inventory entries`);

    // Verify each store has Glaze Powder
    console.log('\n📊 STEP 3: VERIFICATION RESULTS');
    console.log('-'.repeat(40));
    
    const storesWithGlazePowder = [];
    const storesWithoutGlazePowder = [];
    let totalQuantity = 0;
    let totalValue = 0;

    for (const store of stores) {
      const storeInventory = glazePowderInventory.find(item => item.store_id === store.id);
      
      if (storeInventory) {
        storesWithGlazePowder.push({
          store: store.name,
          quantity: storeInventory.stock_quantity,
          unit: storeInventory.unit,
          cost: storeInventory.cost,
          value: storeInventory.stock_quantity * (storeInventory.cost || 0)
        });
        totalQuantity += storeInventory.stock_quantity;
        totalValue += storeInventory.stock_quantity * (storeInventory.cost || 0);
        
        console.log(`✅ ${store.name}: ${storeInventory.stock_quantity}${storeInventory.unit} (₱${(storeInventory.stock_quantity * (storeInventory.cost || 0)).toFixed(2)})`);
      } else {
        storesWithoutGlazePowder.push(store.name);
        console.log(`❌ ${store.name}: No Glaze Powder inventory found`);
      }
    }

    // Summary
    console.log('\n📈 DEPLOYMENT VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`✅ Stores with Glaze Powder: ${storesWithGlazePowder.length}/${stores.length}`);
    console.log(`❌ Stores missing Glaze Powder: ${storesWithoutGlazePowder.length}`);
    console.log(`📦 Total Glaze Powder deployed: ${totalQuantity}g`);
    console.log(`💰 Total inventory value: ₱${totalValue.toFixed(2)}`);

    if (storesWithoutGlazePowder.length > 0) {
      console.log(`\n⚠️ Missing from stores: ${storesWithoutGlazePowder.join(', ')}`);
    }

    if (storesWithGlazePowder.length === stores.length) {
      console.log('\n🎉 SUCCESS: All stores have Glaze Powder inventory!');
      console.log('✅ Deployment verification completed successfully');
    } else {
      console.log('\n❌ INCOMPLETE: Some stores are missing Glaze Powder inventory');
      console.log('🔧 Run the deployment script again to fix missing entries');
    }

  } catch (error) {
    console.error("❌ Verification failed:", error);
    throw error;
  }
}

// Run the verification
if (require.main === module) {
  verifyGlazePowderDeployment()
    .then(() => {
      console.log("\n✨ Verification completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Verification failed:", error);
      process.exit(1);
    });
}
