#!/usr/bin/env node

/**
 * Test Regular Croissant Item Script
 * 
 * This script specifically tests the Regular Croissant commissary item.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

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

async function authenticate() {
  console.log('🔐 Authenticating...');
  
  const options = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const result = await makeRequest(options, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  console.log('✅ Authentication successful');
  return {
    accessToken: result.access_token,
    userId: result.user.id
  };
}

async function testRegularCroissant() {
  console.log('🥐 Testing Regular Croissant commissary item...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Find Regular Croissant specifically
  console.log('🔍 Searching for Regular Croissant...');
  const searchOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/commissary_inventory?select=*&name=ilike.*Regular%20Croissant*',
    method: 'GET',
    headers
  };
  
  const results = await makeRequest(searchOptions);
  console.log(`✅ Found ${results.length} matching items\n`);
  
  if (results.length > 0) {
    const croissant = results[0];
    console.log('📋 Regular Croissant details:');
    console.log(`   ID: ${croissant.id}`);
    console.log(`   Name: ${croissant.name}`);
    console.log(`   Unit: ${croissant.unit}`);
    console.log(`   Unit Cost: ${croissant.unit_cost}`);
    console.log(`   Current Stock: ${croissant.current_stock}`);
    console.log(`   Category: ${croissant.category}`);
    console.log(`   Item Type: ${croissant.item_type}`);
    console.log(`   Is Active: ${croissant.is_active}`);
    
    // Simulate the mapping that happens in the service
    const mappedItem = {
      id: croissant.id,
      item: croissant.name,
      name: croissant.name,
      display_unit: croissant.unit,
      unit: croissant.unit,
      available_servings: croissant.current_stock || 0,
      cost_per_unit: croissant.unit_cost || 0,
      unit_cost: croissant.unit_cost || 0,
      supports_fractional: true, // Regular Croissant supports fractional
      commissary_item_id: croissant.id
    };
    
    console.log('\n🔄 Mapped item for form:');
    console.log(`   item: ${mappedItem.item}`);
    console.log(`   name: ${mappedItem.name}`);
    console.log(`   unit: ${mappedItem.unit}`);
    console.log(`   display_unit: ${mappedItem.display_unit}`);
    console.log(`   cost_per_unit: ${mappedItem.cost_per_unit}`);
    console.log(`   unit_cost: ${mappedItem.unit_cost}`);
    
    console.log('\n💡 Expected form behavior:');
    console.log(`   - Ingredient Name: "${mappedItem.name}"`);
    console.log(`   - Unit: "${mappedItem.unit}"`);
    console.log(`   - Estimated Cost per Unit: ₱${mappedItem.cost_per_unit}`);
  } else {
    console.log('❌ Regular Croissant not found in commissary inventory');
  }
  
  console.log('\n✅ Regular Croissant test complete!');
}

testRegularCroissant().catch(console.error);
