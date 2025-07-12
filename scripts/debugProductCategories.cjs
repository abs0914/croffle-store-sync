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

async function debugProductCategories() {
  console.log('🔍 Debugging product categories...\n');
  
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
  
  // Fetch products with their categories for Sugbo Mercado
  const sugboStoreId = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  
  console.log('📋 Fetching products with categories...');
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,product_name,price,category_id,categories(id,name)&store_id=eq.${sugboStoreId}&order=product_name`,
    method: 'GET',
    headers
  };

  const products = await makeRequest(options);

  if (!Array.isArray(products)) {
    console.error('❌ Error fetching products:', products);
    return;
  }

  console.log(`✅ Found ${products.length} products\n`);

  // Group products by category
  const productsByCategory = {};
  products.forEach(product => {
    const categoryName = product.categories?.name || 'Uncategorized';
    if (!productsByCategory[categoryName]) {
      productsByCategory[categoryName] = [];
    }
    productsByCategory[categoryName].push(product);
  });

  // Display products by category
  console.log('📂 Products grouped by category:');
  Object.entries(productsByCategory).forEach(([categoryName, categoryProducts]) => {
    console.log(`\n   📁 ${categoryName} (${categoryProducts.length} products):`);
    categoryProducts.forEach(product => {
      console.log(`      - ${product.product_name} (₱${product.price}) [ID: ${product.category_id}]`);
    });
  });

  // Focus on addon products
  console.log('\n🔧 Addon products analysis:');
  const addonProducts = products.filter(product => {
    const categoryName = product.categories?.name?.toLowerCase() || '';
    return categoryName.includes('addon') || categoryName.includes('add-on');
  });

  console.log(`✅ Found ${addonProducts.length} addon products:`);
  addonProducts.forEach(product => {
    console.log(`   - ${product.product_name} (₱${product.price})`);
    console.log(`     Category: "${product.categories?.name}" (ID: ${product.category_id})`);
  });

  // Check specific products mentioned in the issue
  console.log('\n🎯 Specific product analysis:');
  const specificProducts = ['Blueberry Jam', 'Oreo Cookies', 'Caramel'];
  specificProducts.forEach(productName => {
    const product = products.find(p => p.product_name === productName);
    if (product) {
      console.log(`   - ${product.product_name}:`);
      console.log(`     Category: "${product.categories?.name}" (ID: ${product.category_id})`);
      console.log(`     Price: ₱${product.price}`);
    } else {
      console.log(`   - ${productName}: NOT FOUND`);
    }
  });
}

debugProductCategories().catch(console.error);
