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
    throw error;
  }
}

async function checkPOSCategories() {
  console.log('🔍 Checking POS Categories and Product Structure...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.access_token}`,
    'Content-Type': 'application/json'
  };

  // Get all stores
  console.log('🏪 Fetching stores...');
  const storesOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  console.log('Stores response:', stores);

  if (!Array.isArray(stores)) {
    console.error('Failed to fetch stores:', stores);
    return;
  }

  console.log(`Found ${stores.length} stores:`);
  stores.forEach(store => console.log(`   - ${store.name} (${store.id})`));

  // For each store, check categories and products
  for (const store of stores) {
    console.log(`\n📍 Store: ${store.name} (${store.id})`);
    
    // Get categories for this store
    const categoriesOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/categories?select=id,name,is_active&store_id=eq.${store.id}&order=name`,
      method: 'GET',
      headers
    };
    
    const categories = await makeRequest(categoriesOptions);
    console.log(`   📂 Categories (${categories.length}):`);
    categories.forEach(cat => {
      console.log(`      - ${cat.name} (${cat.id}) ${cat.is_active ? '✅' : '❌'}`);
    });

    // Get products for this store
    const productsOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,category_id,categories(name)&store_id=eq.${store.id}&order=product_name`,
      method: 'GET',
      headers
    };
    
    const products = await makeRequest(productsOptions);
    console.log(`   📦 Products (${products.length}):`);
    
    // Group products by category
    const productsByCategory = {};
    products.forEach(product => {
      const categoryName = product.categories?.name || 'No Category';
      if (!productsByCategory[categoryName]) {
        productsByCategory[categoryName] = [];
      }
      productsByCategory[categoryName].push(product.product_name);
    });

    Object.entries(productsByCategory).forEach(([categoryName, productList]) => {
      console.log(`      📂 ${categoryName}:`);
      productList.forEach(productName => {
        console.log(`         - ${productName}`);
      });
    });
  }

  // Check addon categories
  console.log('\n🔧 Addon Categories:');
  const addonCategoriesOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/addon_categories?select=id,name,category_type,is_active&order=display_order',
    method: 'GET',
    headers
  };
  
  const addonCategories = await makeRequest(addonCategoriesOptions);
  console.log(`Found ${addonCategories.length} addon categories:`);
  addonCategories.forEach(cat => {
    console.log(`   - ${cat.name} (${cat.category_type}) ${cat.is_active ? '✅' : '❌'}`);
  });

  // Check for products in addon categories
  console.log('\n🔍 Checking for products in addon categories...');
  const addonCategoryNames = addonCategories.map(cat => cat.name);
  
  for (const store of stores) {
    const storeProducts = await makeRequest({
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=product_name,categories(name)&store_id=eq.${store.id}`,
      method: 'GET',
      headers
    });

    const addonProducts = storeProducts.filter(product => 
      addonCategoryNames.includes(product.categories?.name)
    );

    if (addonProducts.length > 0) {
      console.log(`   📍 ${store.name} has ${addonProducts.length} products in addon categories:`);
      addonProducts.forEach(product => {
        console.log(`      - ${product.product_name} (${product.categories?.name})`);
      });
    }
  }
}

checkPOSCategories().catch(console.error);
