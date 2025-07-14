#!/usr/bin/env node

/**
 * Deploy Glaze Powder to All Stores
 * 
 * This script deploys 20,000 grams of Glaze Powder to all active stores
 * in the croffle-store-sync system.
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

async function deployGlazePowderToAllStores() {
  try {
    console.log("🚀 Starting Glaze Powder deployment to all stores...");
    console.log('='.repeat(50));

    await authenticateAdmin();

    // Step 1: Get all active stores
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

    if (!stores || stores.length === 0) {
      console.log("❌ No active stores found");
      return;
    }

    console.log(`✅ Found ${stores.length} active stores:`);
    stores.forEach(store => {
      console.log(`   - ${store.name} (${store.id})`);
    });

    // Step 2: Check for existing Glaze Powder inventory
    console.log('\n🔍 STEP 2: CHECKING EXISTING GLAZE POWDER INVENTORY');
    console.log('-'.repeat(40));
    
    const existingInventoryOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: '/rest/v1/inventory_stock?select=*&item=eq.Glaze%20Powder',
      method: 'GET',
      headers
    };

    const existingInventory = await makeRequest(existingInventoryOptions);
    
    if (existingInventory.length > 0) {
      console.log(`⚠️ Found ${existingInventory.length} existing Glaze Powder entries:`);
      existingInventory.forEach(item => {
        const store = stores.find(s => s.id === item.store_id);
        console.log(`   - ${store?.name || 'Unknown Store'}: ${item.stock_quantity}${item.unit}`);
      });
    } else {
      console.log('✅ No existing Glaze Powder inventory found');
    }

    // Step 3: Deploy Glaze Powder to all stores
    console.log('\n📦 STEP 3: DEPLOYING GLAZE POWDER TO ALL STORES');
    console.log('-'.repeat(40));

    const deploymentResults = [];
    
    for (const store of stores) {
      console.log(`\n🏪 Processing ${store.name}...`);
      
      try {
        // Check if this store already has Glaze Powder
        const existingForStore = existingInventory.find(item => item.store_id === store.id);
        
        if (existingForStore) {
          // Update existing inventory
          const updateOptions = {
            hostname: SUPABASE_URL,
            port: 443,
            path: `/rest/v1/inventory_stock?id=eq.${existingForStore.id}`,
            method: 'PATCH',
            headers
          };
          
          const updateData = {
            stock_quantity: 20000,
            cost: 0.008, // 8 pesos per gram = 0.008 per gram
            minimum_threshold: 1000,
            is_active: true
          };
          
          await makeRequest(updateOptions, updateData);
          console.log(`   ✅ Updated existing inventory: 20,000g Glaze Powder`);
          
          deploymentResults.push({
            store: store.name,
            storeId: store.id,
            action: 'updated',
            success: true,
            quantity: 20000
          });
          
        } else {
          // Create new inventory entry
          const createOptions = {
            hostname: SUPABASE_URL,
            port: 443,
            path: '/rest/v1/inventory_stock',
            method: 'POST',
            headers
          };
          
          const inventoryData = {
            store_id: store.id,
            item: 'Glaze Powder',
            unit: 'g',
            stock_quantity: 20000,
            cost: 0.008, // 8 pesos per gram = 0.008 per gram
            minimum_threshold: 1000,
            is_active: true
          };
          
          const newInventory = await makeRequest(createOptions, inventoryData);
          console.log(`   ✅ Created new inventory: 20,000g Glaze Powder`);
          
          deploymentResults.push({
            store: store.name,
            storeId: store.id,
            action: 'created',
            success: true,
            quantity: 20000,
            inventoryId: newInventory[0]?.id
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to deploy to ${store.name}: ${error.message}`);
        deploymentResults.push({
          store: store.name,
          storeId: store.id,
          action: 'failed',
          success: false,
          error: error.message
        });
      }
    }

    // Step 4: Summary and results
    console.log('\n📊 STEP 4: DEPLOYMENT SUMMARY');
    console.log('='.repeat(50));
    
    const successful = deploymentResults.filter(r => r.success);
    const failed = deploymentResults.filter(r => !r.success);
    
    console.log(`✅ Successfully deployed to ${successful.length} stores:`);
    successful.forEach(result => {
      console.log(`   📦 ${result.store}: 20,000g Glaze Powder (${result.action})`);
    });
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed deployments (${failed.length}):`);
      failed.forEach(result => {
        console.log(`   💥 ${result.store}: ${result.error}`);
      });
    }
    
    console.log(`\n🎯 DEPLOYMENT COMPLETE:`);
    console.log(`   ✅ Success: ${successful.length}/${stores.length} stores`);
    console.log(`   📦 Total Glaze Powder deployed: ${successful.length * 20000}g`);
    console.log(`   💰 Total inventory value: ₱${(successful.length * 20000 * 0.008).toFixed(2)}`);

    if (successful.length === stores.length) {
      console.log('\n🎉 All stores successfully updated with Glaze Powder inventory!');
    } else {
      console.log('\n⚠️ Some deployments failed. Please check the errors above.');
    }

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Run the deployment
if (require.main === module) {
  deployGlazePowderToAllStores()
    .then(() => {
      console.log("\n✨ Script execution completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error);
      process.exit(1);
    });
}
