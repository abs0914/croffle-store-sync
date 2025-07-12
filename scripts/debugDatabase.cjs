#!/usr/bin/env node

/**
 * Debug Database Connection
 * 
 * This script tests basic database connectivity and checks for data.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

const headers = {
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
          const result = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(result)}`));
          } else {
            resolve(result);
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

async function debugDatabase() {
  console.log('🔍 Debugging Database Connection\n');
  
  try {
    // Test 1: Check stores
    console.log('📍 Test 1: Checking stores...');
    const storesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/stores?select=id,name,is_active&limit=5',
      method: 'GET',
      headers
    };
    
    const stores = await makeRequest(storesOptions);
    console.log(`✅ Found ${stores.length} stores:`);
    stores.forEach(store => {
      console.log(`   - ${store.name} (${store.id}) - Active: ${store.is_active}`);
    });
    
    // Test 2: Check recipe templates
    console.log('\n📋 Test 2: Checking recipe templates...');
    const templatesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=id,name,category_name,is_active&limit=10',
      method: 'GET',
      headers
    };
    
    const templates = await makeRequest(templatesOptions);
    console.log(`✅ Found ${templates.length} recipe templates:`);
    templates.forEach(template => {
      console.log(`   - ${template.name} (${template.category_name || 'No category'}) - Active: ${template.is_active}`);
    });
    
    // Test 3: Look specifically for Cookies & Cream
    console.log('\n🍪 Test 3: Searching for Cookies & Cream...');
    const cookiesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_templates?select=*&name=ilike.*cookies*',
      method: 'GET',
      headers
    };
    
    const cookiesTemplates = await makeRequest(cookiesOptions);
    console.log(`✅ Found ${cookiesTemplates.length} templates with 'cookies' in name:`);
    cookiesTemplates.forEach(template => {
      console.log(`   - ${template.name} (ID: ${template.id})`);
      console.log(`     Category: ${template.category_name || template.category || 'None'}`);
      console.log(`     Active: ${template.is_active}`);
      console.log(`     Price: ₱${template.suggested_price}`);
    });
    
    // Test 4: Check recipes (deployed templates)
    console.log('\n🍽️ Test 4: Checking deployed recipes...');
    const recipesOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipes?select=id,name,store_id,template_id&limit=10',
      method: 'GET',
      headers
    };
    
    const recipes = await makeRequest(recipesOptions);
    console.log(`✅ Found ${recipes.length} deployed recipes:`);
    recipes.forEach(recipe => {
      console.log(`   - ${recipe.name} (Store: ${recipe.store_id})`);
    });
    
    // Test 5: Check product catalog
    console.log('\n🛍️ Test 5: Checking product catalog...');
    const productsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/product_catalog?select=id,product_name,store_id,price&limit=10',
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productsOptions);
    console.log(`✅ Found ${products.length} products in catalog:`);
    products.forEach(product => {
      console.log(`   - ${product.product_name} (₱${product.price}) - Store: ${product.store_id}`);
    });

    // Test 6: Check deployment logs
    console.log('\n📝 Test 6: Checking deployment logs...');
    const logsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_deployment_logs?select=*&order=created_at.desc&limit=10',
      method: 'GET',
      headers
    };

    const logs = await makeRequest(logsOptions);
    console.log(`✅ Found ${logs.length} deployment logs:`);
    logs.forEach(log => {
      console.log(`   - ${log.created_at}: ${log.deployment_status} (Store: ${log.store_id})`);
    });

    // Test 7: Check deployment records
    console.log('\n📊 Test 7: Checking deployment records...');
    const deploymentsOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/recipe_deployments?select=*&order=created_at.desc&limit=10',
      method: 'GET',
      headers
    };

    const deployments = await makeRequest(deploymentsOptions);
    console.log(`✅ Found ${deployments.length} deployment records:`);
    deployments.forEach(deployment => {
      console.log(`   - ${deployment.created_at}: Store ${deployment.store_id} - Status: ${deployment.deployment_status}`);
    });

    // Test 8: Check commissary inventory structure
    console.log('\n🏪 Test 8: Checking commissary inventory...');
    const commissaryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/commissary_inventory?select=*&limit=5',
      method: 'GET',
      headers
    };

    const commissaryItems = await makeRequest(commissaryOptions);
    console.log(`✅ Found ${commissaryItems.length} items in commissary inventory:`);
    if (commissaryItems.length > 0) {
      console.log('Sample items:');
      commissaryItems.forEach(item => {
        console.log(`   - ${JSON.stringify(item)}`);
      });
    }

    // Test 9: Check if there are any tables with data
    console.log('\n📊 Test 9: Checking for any existing data...');

    // Check app_users
    const usersOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/app_users?select=*&limit=3',
      method: 'GET',
      headers
    };

    const users = await makeRequest(usersOptions);
    console.log(`   Users: ${users.length} found`);

    // Check inventory_items
    const inventoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: '/rest/v1/inventory_items?select=*&limit=3',
      method: 'GET',
      headers
    };

    const inventory = await makeRequest(inventoryOptions);
    console.log(`   Inventory items: ${inventory.length} found`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the debug
debugDatabase();
