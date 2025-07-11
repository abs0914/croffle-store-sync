#!/usr/bin/env node

/**
 * Test Single Recipe Upload
 * 
 * This script tests uploading just one recipe with detailed error logging.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Test recipe
const testRecipe = {
  product: 'Test Mango',
  category: 'classic',
  price: 125,
  ingredients: [
    { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
    { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
    { name: 'Mango Jam', unit: 'scoop', quantity: 1, cost: 7 }
  ]
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Making request to: ${options.path}`);
    console.log(`   Method: ${options.method}`);
    if (data) {
      console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
    }
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`📡 Response Status: ${res.statusCode}`);
        console.log(`📡 Response Headers: ${JSON.stringify(res.headers, null, 2)}`);
        console.log(`📡 Response Body: ${body}`);
        
        try {
          const result = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          console.log(`❌ JSON Parse Error: ${error.message}`);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Request Error: ${error.message}`);
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
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
  
  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };
  
  const result = await makeRequest(options, authData);
  console.log('✅ Authentication successful');
  return {
    accessToken: result.access_token,
    userId: result.user.id
  };
}

async function testRecipeUpload() {
  console.log('🧪 Testing single recipe upload...\n');
  
  try {
    const auth = await authenticate();
    
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    
    console.log(`\n📋 Processing recipe: ${testRecipe.product}`);
    
    const totalCost = testRecipe.ingredients.reduce((sum, ing) => sum + (ing.cost * ing.quantity), 0);
    console.log(`💰 Total cost: ${totalCost}`);
    
    // Step 1: Check existing template
    console.log('\n📝 Step 1: Checking for existing recipe template...');
    const checkOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/recipe_templates?name=eq.${encodeURIComponent(testRecipe.product)}&select=id`,
      method: 'GET',
      headers
    };
    
    const existing = await makeRequest(checkOptions);
    console.log(`✅ Found ${existing.length} existing templates`);
    
    let templateId;
    
    if (existing.length > 0) {
      templateId = existing[0].id;
      console.log(`📝 Will update existing template: ${templateId}`);
    } else {
      // Step 2: Create new template
      console.log('\n📝 Step 2: Creating new recipe template...');
      const createOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/recipe_templates',
        method: 'POST',
        headers
      };
      
      const templateData = {
        name: testRecipe.product,
        description: `${testRecipe.product} recipe`,
        category_name: testRecipe.category,
        instructions: `Prepare ${testRecipe.product}`,
        yield_quantity: 1,
        serving_size: 1,
        total_cost: totalCost,
        suggested_price: testRecipe.price,
        version: 1,
        is_active: true,
        created_by: auth.userId
      };
      
      const newTemplate = await makeRequest(createOptions, templateData);
      templateId = newTemplate[0].id;
      console.log(`✅ Created template with ID: ${templateId}`);
    }
    
    // Step 3: Process first ingredient
    console.log('\n🥖 Step 3: Processing first ingredient...');
    const firstIngredient = testRecipe.ingredients[0];
    console.log(`Processing: ${firstIngredient.name}`);
    
    // Find or create commissary item
    const itemOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/commissary_inventory?name=eq.${encodeURIComponent(firstIngredient.name)}&is_active=eq.true&select=id`,
      method: 'GET',
      headers
    };
    
    const items = await makeRequest(itemOptions);
    console.log(`✅ Found ${items.length} existing commissary items`);
    
    let itemId;
    if (items.length === 0) {
      console.log('📦 Creating new commissary item...');
      const createItemOptions = {
        hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
        port: 443,
        path: '/rest/v1/commissary_inventory',
        method: 'POST',
        headers
      };
      
      const itemData = {
        name: firstIngredient.name,
        category: 'raw_materials',
        item_type: 'raw_material',
        current_stock: 100,
        minimum_threshold: 10,
        unit: firstIngredient.unit,
        unit_cost: firstIngredient.cost,
        is_active: true
      };
      
      const newItem = await makeRequest(createItemOptions, itemData);
      itemId = newItem[0].id;
      console.log(`✅ Created commissary item with ID: ${itemId}`);
    } else {
      itemId = items[0].id;
      console.log(`✅ Using existing commissary item: ${itemId}`);
    }
    
    console.log('\n🎉 Test completed successfully!');
    console.log('The basic operations are working. The issue might be with batch processing.');
    
  } catch (error) {
    console.log('\n❌ Test failed!');
    console.log(`Error: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  }
}

testRecipeUpload();
