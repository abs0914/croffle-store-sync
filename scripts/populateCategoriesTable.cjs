#!/usr/bin/env node

/**
 * Populate Categories Table Script
 * 
 * This script populates the categories table with categories from recipe templates
 * to fix the Edit Recipe Template dropdown issue.
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

async function populateCategoriesTable() {
  console.log('🔍 Populating categories table from recipe templates...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Check existing categories table
  console.log('📋 Checking existing categories table...');
  const categoriesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/categories?select=name',
    method: 'GET',
    headers
  };
  
  let existingCategoryNames = [];
  try {
    const existingCategories = await makeRequest(categoriesOptions);
    existingCategoryNames = existingCategories.map(cat => cat.name);
    console.log(`✅ Found ${existingCategories.length} existing categories in categories table`);
  } catch (error) {
    console.log('⚠️  Categories table might be empty or have issues:', error.message);
  }
  
  // Get unique categories from recipe templates
  console.log('\n📋 Getting unique categories from recipe templates...');
  const templatesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/recipe_templates?select=category_name&order=category_name',
    method: 'GET',
    headers
  };
  
  const templates = await makeRequest(templatesOptions);
  const uniqueCategories = [...new Set(templates.map(t => t.category_name).filter(Boolean))];
  
  console.log(`✅ Found ${uniqueCategories.length} unique categories in recipe templates:`);
  uniqueCategories.forEach(cat => {
    console.log(`   - ${cat}`);
  });
  
  // Get all stores first
  console.log('\n📋 Getting all stores...');
  const storesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/stores?select=id,name&is_active=eq.true',
    method: 'GET',
    headers
  };

  const stores = await makeRequest(storesOptions);
  console.log(`✅ Found ${stores.length} active stores`);

  // Create missing categories in categories table for each store
  console.log('\n🔄 Creating missing categories in categories table for each store...');

  let createdCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const store of stores) {
    console.log(`\n🏪 Processing store: ${store.name}`);

    for (const categoryName of uniqueCategories) {
      // Check if this category already exists for this store
      const checkCategoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: `/rest/v1/categories?select=id&store_id=eq.${store.id}&name=eq.${encodeURIComponent(categoryName)}`,
        method: 'GET',
        headers
      };

      try {
        const existingCategory = await makeRequest(checkCategoryOptions);
        if (existingCategory && existingCategory.length > 0) {
          console.log(`   ⚠️  Already exists: ${categoryName}`);
          skippedCount++;
          continue;
        }
      } catch (error) {
        console.log(`   ⚠️  Error checking existing category: ${error.message}`);
      }

      const createCategoryOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/categories',
        method: 'POST',
        headers
      };

      try {
        await makeRequest(createCategoryOptions, {
          name: categoryName,
          description: `Auto-created category for ${categoryName} recipes`,
          is_active: true,
          store_id: store.id
        });
        console.log(`   ✅ Created: ${categoryName}`);
        createdCount++;
      } catch (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          console.log(`   ⚠️  Already exists: ${categoryName}`);
          skippedCount++;
        } else {
          console.log(`   ❌ Failed to create ${categoryName}: ${error.message}`);
          failedCount++;
        }
      }
    }
  }
  
  console.log('\n📊 RESULTS:');
  console.log(`   Categories created: ${createdCount}`);
  console.log(`   Categories skipped (already exist): ${skippedCount}`);
  console.log(`   Categories failed: ${failedCount}`);
  
  console.log('\n✅ Categories table population complete!');
  console.log('💡 The Edit Recipe Template dropdown should now show all categories.');
}

populateCategoriesTable().catch(console.error);
