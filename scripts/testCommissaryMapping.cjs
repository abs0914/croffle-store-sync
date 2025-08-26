#!/usr/bin/env node

/**
 * Test Commissary Mapping Script
 * 
 * This script tests how commissary items are mapped for the recipe ingredient form.
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

function supportsFractionalQuantity(ingredientName) {
  const MINI_CROFFLE_INGREDIENTS = [
    'REGULAR CROISSANT', 'WHIPPED CREAM', 'BLUEBERRY JAM', 'STRAWBERRY JAM',
    'CHOCOLATE SYRUP', 'CARAMEL SYRUP', 'NUTELLA', 'BISCOFF SPREAD',
    'OREO COOKIES', 'KITKAT', 'CHOPSTICK', 'WAX PAPER'
  ];
  
  return MINI_CROFFLE_INGREDIENTS.some(miniIngredient => 
    ingredientName.toLowerCase().includes(miniIngredient.toLowerCase())
  );
}

async function testCommissaryMapping() {
  console.log('🧪 Testing commissary item mapping...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Simulate the getCommissaryInventoryItems function
  console.log('📋 Fetching commissary inventory items...');
  const commissaryOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/commissary_inventory?select=id,name,unit,current_stock,unit_cost,is_active&is_active=eq.true&order=name',
    method: 'GET',
    headers
  };
  
  const data = await makeRequest(commissaryOptions);
  console.log(`✅ Found ${data.length} commissary items\n`);
  
  // Map the data like the service does
  const mappedData = (data || []).map(item => ({
    id: item.id,
    item: item.name,
    name: item.name, // Add name field for commissary items
    display_unit: item.unit,
    unit: item.unit, // Add unit field for commissary items
    available_servings: item.current_stock || 0,
    cost_per_unit: item.unit_cost || 0,
    unit_cost: item.unit_cost || 0, // Add unit_cost field for commissary items
    supports_fractional: supportsFractionalQuantity(item.name),
    commissary_item_id: item.id
  }));
  
  console.log('🔄 Mapped commissary items for recipe form:');
  mappedData.slice(0, 3).forEach((item, index) => {
    console.log(`\n   ${index + 1}. ${item.name}`);
    console.log(`      ID: ${item.id}`);
    console.log(`      Unit: ${item.unit}`);
    console.log(`      Display Unit: ${item.display_unit}`);
    console.log(`      Unit Cost: ₱${item.unit_cost}`);
    console.log(`      Cost Per Unit: ₱${item.cost_per_unit}`);
    console.log(`      Available: ${item.available_servings}`);
    console.log(`      Supports Fractional: ${item.supports_fractional}`);
  });
  
  console.log('\n✅ Commissary mapping test complete!');
  console.log('💡 The Edit Recipe Template form should now populate unit and cost fields correctly.');
}

testCommissaryMapping().catch(console.error);
