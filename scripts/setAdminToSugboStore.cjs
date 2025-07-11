#!/usr/bin/env node

/**
 * Set Admin to Sugbo Store Script
 * 
 * This script sets the admin user to use Sugbo Mercado store as the primary store.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const SUGBO_STORE_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function setAdminToSugboStore() {
  console.log('🔧 Setting admin user to use Sugbo Mercado store...\n');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const authResult = await makeRequest(authOptions, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${authResult.access_token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔐 Authenticated as admin user');
  console.log('👤 User ID:', authResult.user.id);
  
  // Check current app_users record
  console.log('\n📋 Checking current app_users record...');
  const checkUserOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/app_users?select=*&user_id=eq.${authResult.user.id}`,
    method: 'GET',
    headers
  };
  
  const currentUsers = await makeRequest(checkUserOptions);
  
  if (currentUsers.length > 0) {
    const currentUser = currentUsers[0];
    console.log('✅ Found existing app_users record:');
    console.log(`   Role: ${currentUser.role}`);
    console.log(`   Store IDs: ${JSON.stringify(currentUser.store_ids)}`);
    
    // Update the store_ids to prioritize Sugbo Mercado
    const allStoreIds = currentUser.store_ids || [];
    
    // Put Sugbo Mercado first in the array
    const updatedStoreIds = [SUGBO_STORE_ID, ...allStoreIds.filter(id => id !== SUGBO_STORE_ID)];
    
    console.log('\n🔄 Updating store priority...');
    console.log(`   New store order: ${JSON.stringify(updatedStoreIds)}`);
    
    const updateOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/app_users?user_id=eq.${authResult.user.id}`,
      method: 'PATCH',
      headers
    };
    
    try {
      await makeRequest(updateOptions, { store_ids: updatedStoreIds });
      console.log('✅ Updated admin user store priority');
    } catch (error) {
      console.log(`❌ Failed to update: ${error.message}`);
    }
    
  } else {
    console.log('⚠️ No app_users record found, creating one...');
    
    // Get all store IDs
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id&is_active=eq.true',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    const allStoreIds = stores.map(store => store.id);
    
    // Put Sugbo Mercado first
    const prioritizedStoreIds = [SUGBO_STORE_ID, ...allStoreIds.filter(id => id !== SUGBO_STORE_ID)];
    
    const createOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/app_users',
      method: 'POST',
      headers
    };
    
    try {
      await makeRequest(createOptions, {
        user_id: authResult.user.id,
        first_name: 'Admin',
        last_name: 'User',
        email: ADMIN_EMAIL,
        role: 'admin',
        store_ids: prioritizedStoreIds,
        is_active: true
      });
      console.log('✅ Created admin user record with Sugbo Mercado priority');
    } catch (error) {
      console.log(`❌ Failed to create: ${error.message}`);
    }
  }
  
  // Verify the Sugbo Mercado store details
  console.log('\n🏪 Verifying Sugbo Mercado store...');
  const storeOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/stores?select=*&id=eq.${SUGBO_STORE_ID}`,
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storeOptions);
  if (stores.length > 0) {
    const store = stores[0];
    console.log(`✅ Store found: ${store.name}`);
    console.log(`   ID: ${store.id}`);
    console.log(`   Active: ${store.is_active}`);
  } else {
    console.log('❌ Sugbo Mercado store not found');
  }
  
  // Check products in Sugbo Mercado
  console.log('\n📦 Checking products in Sugbo Mercado...');
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=*&store_id=eq.${SUGBO_STORE_ID}`,
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`✅ Found ${products.length} products in Sugbo Mercado:`);
  products.forEach(product => {
    console.log(`   - ${product.product_name} (₱${product.price})`);
  });
  
  console.log('\n✅ Admin user setup complete!');
  console.log('💡 Please refresh the POS - it should now default to Sugbo Mercado store.');
  console.log('🎯 Tiramisu should appear in the "Classic" category.');
}

setAdminToSugboStore().catch(console.error);
