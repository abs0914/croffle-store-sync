#!/usr/bin/env node

/**
 * Manual Inventory Update
 * 
 * This script manually updates inventory levels for the Cookies & Cream sale
 * using individual API calls.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

// Inventory updates for Cookies & Cream sale
const UPDATES = [
  { id: '2f029143-3064-47d2-b358-a251e873c395', item: 'REGULAR CROISSANT', newQuantity: 124 },
  { id: 'c29438a2-3881-4b62-9cbc-c8e2e0efbdb2', item: 'WHIPPED CREAM', newQuantity: 128 },
  { id: 'cf52cc90-1b74-466c-b13d-06f8fb88a730', item: 'Oreo Crushed', newQuantity: 47 },
  { id: '53329aaa-6069-4d4a-a738-94c693cc05ab', item: 'Oreo Cookies', newQuantity: 52 },
  { id: 'cbaa7779-9881-4c40-81d9-de6b1bf2b5e6', item: 'Chopstick', newQuantity: 91 },
  { id: '1c6c22a1-ae7f-47b4-81a1-2931fe1a9055', item: 'Wax Paper', newQuantity: 73 }
];

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (body.trim() === '') {
            resolve({}); // Empty response is OK for updates
          } else {
            const result = JSON.parse(body);
            if (res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
            } else {
              resolve(result);
            }
          }
        } catch (e) {
          if (res.statusCode < 400) {
            resolve({}); // Successful update with empty response
          } else {
            reject(new Error(`Parse error: ${e.message}`));
          }
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
  console.log('🔐 Authenticating as admin...');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers
  };
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const authResult = await makeRequest(authOptions, authData);
    console.log('✅ Admin authentication successful\n');
    
    // Update headers with the access token
    headers['Authorization'] = `Bearer ${authResult.access_token}`;
    
    return authResult;
  } catch (error) {
    console.log('⚠️ Admin auth failed, continuing with anon key:', error.message);
    return null;
  }
}

async function updateInventoryManually() {
  console.log('🔧 MANUAL INVENTORY UPDATE FOR COOKIES & CREAM SALE');
  console.log('='.repeat(50));
  
  try {
    // Authenticate first
    await authenticateAdmin();
    
    console.log('📦 Updating inventory levels for Cookies & Cream sale...\n');
    
    let successCount = 0;
    
    for (const update of UPDATES) {
      try {
        console.log(`🔧 Updating ${update.item}...`);
        
        // Update inventory stock
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/inventory_stock?id=eq.${update.id}`,
          method: 'PATCH',
          headers: {
            ...headers,
            'Prefer': 'return=minimal'
          }
        };
        
        const updateData = {
          stock_quantity: update.newQuantity
        };
        
        await makeRequest(updateOptions, updateData);
        console.log(`   ✅ ${update.item}: Updated to ${update.newQuantity}`);
        successCount++;
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   ❌ ${update.item}: Failed - ${error.message}`);
      }
    }
    
    console.log(`\n📊 Update Summary:`);
    console.log(`   ✅ Successful: ${successCount}/${UPDATES.length}`);
    
    if (successCount === UPDATES.length) {
      console.log('\n🎉 ALL INVENTORY UPDATES COMPLETED!');
      
      // Verify the updates
      console.log('\n📋 Verifying updated inventory levels:');
      
      for (const update of UPDATES) {
        try {
          const verifyOptions = {
            hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
            port: 443,
            path: `/rest/v1/inventory_stock?select=stock_quantity&id=eq.${update.id}`,
            method: 'GET',
            headers
          };
          
          const result = await makeRequest(verifyOptions);
          
          if (result.length > 0) {
            const currentStock = result[0].stock_quantity;
            const status = currentStock === update.newQuantity ? '✅' : '❌';
            console.log(`   ${status} ${update.item}: ${currentStock} (expected: ${update.newQuantity})`);
          }
        } catch (error) {
          console.log(`   ⚠️ ${update.item}: Could not verify`);
        }
      }
      
      console.log('\n✅ Manual inventory deduction completed successfully!');
      console.log('📊 Inventory has been updated to reflect the Cookies & Cream sale.');
      
    } else {
      console.log('\n⚠️ Some updates failed. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Error during manual update:', error.message);
  }
}

// Run the manual update
updateInventoryManually();
