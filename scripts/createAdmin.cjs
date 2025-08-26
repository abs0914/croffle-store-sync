#!/usr/bin/env node

/**
 * Create Admin Account Script
 * 
 * Usage:
 *   node scripts/createAdmin.cjs
 * 
 * This script creates the admin account if it doesn't exist.
 */

const https = require('https');

// Supabase configuration
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

// Admin credentials
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// HTTP request helper
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          console.log(`Response Status: ${res.statusCode}`);
          console.log(`Response Body: ${body}`);
          
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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test authentication first
async function testAuth() {
  console.log('🔍 Testing authentication...');
  
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
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const result = await makeRequest(options, authData);
    console.log('✅ Authentication successful!');
    console.log(`User ID: ${result.user.id}`);
    console.log(`Email: ${result.user.email}`);
    return result;
  } catch (error) {
    console.log('❌ Authentication failed');
    console.log('This likely means the admin account doesn\'t exist yet');
    return null;
  }
}

// Create admin account
async function createAdmin() {
  console.log('👤 Creating admin account...');
  
  const options = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/signup',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const signupData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  try {
    const result = await makeRequest(options, signupData);
    console.log('✅ Admin account created successfully!');
    console.log(`User ID: ${result.user.id}`);
    console.log(`Email: ${result.user.email}`);
    return result;
  } catch (error) {
    console.log('❌ Failed to create admin account');
    console.log(`Error: ${error.message}`);
    return null;
  }
}

// Main function
async function main() {
  console.log('🚀 Admin Account Setup');
  console.log(`📧 Email: ${ADMIN_EMAIL}`);
  console.log(`🔑 Password: ${ADMIN_PASSWORD}\n`);
  
  // First, test if admin account exists
  const authResult = await testAuth();
  
  if (authResult) {
    console.log('\n🎉 Admin account already exists and works!');
    console.log('You can now run the recipe upload script:');
    console.log('node scripts/uploadRecipes.cjs');
  } else {
    console.log('\n📝 Admin account doesn\'t exist. Creating it...');
    const createResult = await createAdmin();
    
    if (createResult) {
      console.log('\n🎉 Admin account created successfully!');
      console.log('You can now run the recipe upload script:');
      console.log('node scripts/uploadRecipes.cjs');
    } else {
      console.log('\n❌ Failed to create admin account.');
      console.log('💡 You may need to:');
      console.log('   1. Check if email signup is enabled in Supabase');
      console.log('   2. Create the account manually in the Supabase dashboard');
      console.log('   3. Or use different credentials');
    }
  }
}

main().catch(console.error);
