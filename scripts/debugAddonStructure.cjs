const https = require('https');

const SUPABASE_URL = 'bwmkqscqkfoezcuzgpwq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          resolve(body);
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
    hostname: SUPABASE_URL,
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };

  const authData = {
    email: 'admin@example.com',
    password: 'password123'
  };

  try {
    const authResult = await makeRequest(authOptions, authData);
    return authResult;
  } catch (error) {
    console.error('Authentication failed:', error);
    return null;
  }
}

async function debugAddonStructure() {
  console.log('🔍 Debugging addon data structure...\n');

  // Authenticate first
  console.log('🔐 Authenticating...');
  const authResult = await authenticate();
  if (!authResult || !authResult.access_token) {
    console.error('❌ Authentication failed');
    return;
  }
  console.log('✅ Authentication successful');

  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${authResult.access_token}`,
    'Content-Type': 'application/json'
  };

  // Check what tables exist and have data
  const tables = [
    'categories',
    'addon_categories',
    'product_addon_items',
    'product_catalog',
    'recipe_templates'
  ];

  for (const table of tables) {
    console.log(`📋 Checking table: ${table}`);
    try {
      const options = {
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/${table}?select=*&limit=5`,
        method: 'GET',
        headers
      };

      const data = await makeRequest(options);

      if (Array.isArray(data)) {
        console.log(`   ✅ Found ${data.length} rows (showing first 5):`);
        if (data.length > 0) {
          data.forEach((row, index) => {
            const keys = Object.keys(row).slice(0, 4); // Show first 4 columns
            const preview = keys.map(key => `${key}: ${row[key]}`).join(', ');
            console.log(`     ${index + 1}. ${preview}`);
          });
        } else {
          console.log('     (no data)');
        }
      } else {
        console.log(`   ❌ Error: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
    }
    console.log('');
  }
  
  // Check specific addon products from the POS categories script results
  console.log('🛍️ Checking specific addon products from Sugbo Mercado...');
  try {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,price,is_available,store_id,category_id,categories(name)&store_id=eq.d7c47e6b-f20a-4543-a6bd-000398f72df5&limit=20`,
      method: 'GET',
      headers
    };

    const sugboProducts = await makeRequest(options);

    if (Array.isArray(sugboProducts)) {
      console.log(`   ✅ Found ${sugboProducts.length} products in Sugbo Mercado:`);
      sugboProducts.forEach(product => {
        console.log(`     - ${product.product_name} (₱${product.price}) - Category: ${product.categories?.name || 'Unknown'}`);
      });

      // Filter addon products
      const addonProducts = sugboProducts.filter(p =>
        p.categories?.name?.toLowerCase().includes('addon') ||
        p.categories?.name?.toLowerCase().includes('add-on')
      );

      console.log(`\n   🔧 Addon products (${addonProducts.length}):`);
      addonProducts.forEach(product => {
        console.log(`     - ${product.product_name} (₱${product.price}) - ${product.categories?.name}`);
      });
    } else {
      console.log(`   ❌ Error: ${JSON.stringify(sugboProducts)}`);
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
  }
}

debugAddonStructure().catch(console.error);
