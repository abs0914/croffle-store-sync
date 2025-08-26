#!/usr/bin/env node

/**
 * Check Valid Units Script
 * 
 * This script checks what units are allowed in commissary_inventory.
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
  
  return {
    accessToken: result.access_token,
    userId: result.user.id
  };
}

async function checkUnits() {
  console.log('🔍 Checking valid units...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Get all existing commissary items to see what units are used
  console.log('📦 Checking existing commissary inventory units...');
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/commissary_inventory?select=unit,order_unit,normalized_unit&limit=100',
      method: 'GET',
      headers
    };
    
    const result = await makeRequest(options);
    
    const units = new Set();
    const orderUnits = new Set();
    const normalizedUnits = new Set();
    
    result.forEach(item => {
      if (item.unit) units.add(item.unit);
      if (item.order_unit) orderUnits.add(item.order_unit);
      if (item.normalized_unit) normalizedUnits.add(item.normalized_unit);
    });
    
    console.log('✅ Found existing units:');
    console.log('   Units:', Array.from(units).sort());
    console.log('   Order Units:', Array.from(orderUnits).sort());
    console.log('   Normalized Units:', Array.from(normalizedUnits).sort());
    
  } catch (error) {
    console.log('❌ Error checking units:', error.message);
  }
  
  // Test creating a commissary item with different units
  console.log('\n🧪 Testing unit constraints...');
  
  const testUnits = ['piece', 'pieces', 'serving', 'portion', 'pair', 'scoop', 'shot', 'ml', 'cubes', 'pump', 'boxes', 'kg', 'grams', 'liters'];
  
  for (const unit of testUnits) {
    try {
      console.log(`Testing unit: ${unit}...`);
      
      const createOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/commissary_inventory',
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' }
      };
      
      const testData = {
        name: `Test Item ${unit}`,
        category: 'raw_materials',
        item_type: 'raw_material',
        current_stock: 100,
        minimum_threshold: 10,
        unit: unit,
        unit_cost: 1,
        is_active: true,
        order_unit: unit,
        order_quantity: 1,
        serving_quantity: 1,
        conversion_ratio: 1,
        normalized_unit: unit,
        average_cost: 1
      };
      
      const result = await makeRequest(createOptions, testData);
      console.log(`✅ ${unit} - VALID`);
      
      // Clean up - delete the test item
      const deleteOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/commissary_inventory?id=eq.${result[0].id}`,
        method: 'DELETE',
        headers
      };
      await makeRequest(deleteOptions);
      
    } catch (error) {
      console.log(`❌ ${unit} - INVALID: ${error.message}`);
    }
  }
  
  console.log('\n📋 Recommendation: Use only the valid units found above.');
}

checkUnits().catch(console.error);
