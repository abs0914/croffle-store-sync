#!/usr/bin/env node

/**
 * Check Commissary Fields Script
 * 
 * This script checks the actual field names in commissary inventory.
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

async function checkCommissaryFields() {
  console.log('🔍 Checking commissary inventory field names...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Get a sample commissary item to see field structure
  console.log('📋 Getting sample commissary items...');
  const commissaryOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/commissary_inventory?select=*&limit=3',
    method: 'GET',
    headers
  };
  
  const commissaryItems = await makeRequest(commissaryOptions);
  console.log(`✅ Found ${commissaryItems.length} commissary items\n`);
  
  if (commissaryItems.length > 0) {
    console.log('📝 Sample commissary item structure:');
    const sample = commissaryItems[0];
    Object.keys(sample).forEach(key => {
      console.log(`   ${key}: ${sample[key]} (type: ${typeof sample[key]})`);
    });
    
    console.log('\n🔍 Key fields for recipe ingredients:');
    console.log(`   name: ${sample.name}`);
    console.log(`   unit: ${sample.unit || 'NOT FOUND'}`);
    console.log(`   uom: ${sample.uom || 'NOT FOUND'}`);
    console.log(`   unit_cost: ${sample.unit_cost || 'NOT FOUND'}`);
    console.log(`   cost_per_unit: ${sample.cost_per_unit || 'NOT FOUND'}`);
  }
  
  console.log('\n✅ Field check complete!');
}

checkCommissaryFields().catch(console.error);
