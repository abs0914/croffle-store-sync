#!/usr/bin/env node

/**
 * Check Database Schema
 * 
 * This script checks what columns exist in the recipe_templates table.
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

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Check recipe_templates table
  console.log('📋 Checking recipe_templates table...');
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?limit=1',
      method: 'GET',
      headers
    };
    
    const result = await makeRequest(options);
    
    if (result.length > 0) {
      console.log('✅ Found existing recipe template:');
      console.log('📊 Available columns:');
      Object.keys(result[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof result[0][key]} (${result[0][key]})`);
      });
    } else {
      console.log('📝 No existing recipe templates found');
      
      // Try to create a minimal recipe to see what columns are required
      console.log('\n🧪 Testing minimal recipe creation...');
      const createOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipe_templates',
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' }
      };
      
      const minimalRecipe = {
        name: 'Test Recipe',
        description: 'Test description'
      };
      
      try {
        const createResult = await makeRequest(createOptions, minimalRecipe);
        console.log('✅ Created test recipe:');
        console.log('📊 Available columns:');
        Object.keys(createResult[0]).forEach(key => {
          console.log(`   - ${key}: ${typeof createResult[0][key]}`);
        });
        
        // Clean up - delete the test recipe
        const deleteOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/recipe_templates?id=eq.${createResult[0].id}`,
          method: 'DELETE',
          headers
        };
        await makeRequest(deleteOptions);
        console.log('🗑️ Cleaned up test recipe');
        
      } catch (createError) {
        console.log('❌ Failed to create test recipe:');
        console.log(`   Error: ${createError.message}`);
      }
    }
  } catch (error) {
    console.log('❌ Error checking recipe_templates:');
    console.log(`   ${error.message}`);
  }
  
  // Check commissary_inventory table
  console.log('\n📦 Checking commissary_inventory table...');
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/commissary_inventory?limit=1',
      method: 'GET',
      headers
    };
    
    const result = await makeRequest(options);
    
    if (result.length > 0) {
      console.log('✅ Found existing commissary item:');
      console.log('📊 Available columns:');
      Object.keys(result[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof result[0][key]} (${result[0][key]})`);
      });
    } else {
      console.log('📝 No existing commissary items found');
    }
  } catch (error) {
    console.log('❌ Error checking commissary_inventory:');
    console.log(`   ${error.message}`);
  }
  
  // Check recipe_template_ingredients table
  console.log('\n🥖 Checking recipe_template_ingredients table...');
  try {
    const options = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_template_ingredients?limit=1',
      method: 'GET',
      headers
    };
    
    const result = await makeRequest(options);
    
    if (result.length > 0) {
      console.log('✅ Found existing recipe ingredient:');
      console.log('📊 Available columns:');
      Object.keys(result[0]).forEach(key => {
        console.log(`   - ${key}: ${typeof result[0][key]} (${result[0][key]})`);
      });
    } else {
      console.log('📝 No existing recipe ingredients found');
    }
  } catch (error) {
    console.log('❌ Error checking recipe_template_ingredients:');
    console.log(`   ${error.message}`);
  }
}

checkSchema().catch(console.error);
