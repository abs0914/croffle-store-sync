#!/usr/bin/env node

/**
 * Check Product Count
 * 
 * This script checks the total count of products in the catalog.
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
        console.log(`Status: ${res.statusCode}, Response: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || body}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
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

async function authenticate() {
  const authOptions = {
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

  return await makeRequest(authOptions, authData);
}

async function checkProductCount() {
  console.log('📊 Checking product catalog count...\n');
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  
  // Get all products with authentication
  const auth = await authenticate();
  const authHeaders = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.access_token}`,
    'Content-Type': 'application/json'
  };

  const allProductsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=product_name,price,is_available',
    method: 'GET',
    headers: authHeaders
  };
  
  try {
    const allProducts = await makeRequest(allProductsOptions);
    console.log(`📦 Found ${allProducts.length} products total:`);
    
    // Group by category
    const categories = {};
    allProducts.forEach(product => {
      const name = product.product_name;
      let category = 'Other';
      
      if (name.includes('Americano') || name.includes('Cappuccino') || name.includes('Latte') || name.includes('Mocha')) {
        category = 'Espresso';
      } else if (name.includes('Coke') || name.includes('Sprite') || name.includes('Water')) {
        category = 'Beverages';
      } else if (name.includes('Jam') || name.includes('Crushed') || name.includes('Flakes') || name.includes('Sprinkles') || name.includes('Cookies') || name.includes('Marshmallow') || name.includes('Peanut') || name.includes('Chocolate') || name.includes('Caramel')) {
        category = 'Addons';
      } else {
        category = 'Croffles';
      }
      
      if (!categories[category]) categories[category] = [];
      categories[category].push(product);
    });
    
    Object.keys(categories).forEach(category => {
      console.log(`\n${category} (${categories[category].length}):`);
      categories[category].forEach(product => {
        console.log(`   - ${product.product_name} - ₱${product.price}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking product count:', error.message);
  }
}

checkProductCount().catch(console.error);
