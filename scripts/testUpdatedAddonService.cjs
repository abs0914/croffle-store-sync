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

// Simulate the updated fetchAddonRecipes function
async function testFetchAddonRecipes(storeId, headers) {
  console.log(`🧪 Testing fetchAddonRecipes for store: ${storeId}`);
  
  try {
    // Build query to fetch products from addon categories
    let path = `/rest/v1/product_catalog?select=id,product_name,price,is_available,category_id,store_id,categories!inner(name)&is_available=eq.true&order=product_name`;
    
    // Filter by store if provided
    if (storeId) {
      path += `&store_id=eq.${storeId}`;
    }

    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: path,
      method: 'GET',
      headers
    };

    const allProducts = await makeRequest(options);

    if (!Array.isArray(allProducts)) {
      console.error('❌ Error fetching products:', allProducts);
      return [];
    }

    console.log(`✅ Raw products data: ${allProducts.length} products`);

    // Filter products that are in addon categories
    const addonProducts = allProducts.filter(product => {
      const categoryName = product.categories?.name?.toLowerCase() || '';
      return categoryName.includes('addon') || categoryName.includes('add-on');
    });

    console.log(`✅ Filtered addon products: ${addonProducts.length} addon products`);

    // Transform the data into AddonItem format
    const addonItems = addonProducts.map(product => {
      return {
        id: product.id,
        name: product.product_name,
        description: undefined,
        price: product.price || 6,
        cost_per_unit: (product.price || 6) * 0.6,
        category: product.categories?.name || 'addon',
        is_active: product.is_available,
        image_url: undefined
      };
    });

    console.log(`✅ Transformed addon items: ${addonItems.length} items`);
    addonItems.forEach(item => {
      console.log(`   - ${item.name} (₱${item.price}) - ${item.category}`);
    });

    return addonItems;
  } catch (error) {
    console.error('❌ Error in fetchAddonRecipes:', error);
    return [];
  }
}

async function testUpdatedAddonService() {
  console.log('🧪 Testing updated addon service...\n');
  
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
  
  // Test with Sugbo Mercado store (has addon products)
  const sugboStoreId = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  
  console.log('\n📍 Testing with Sugbo Mercado store...');
  const sugboAddons = await testFetchAddonRecipes(sugboStoreId, headers);
  
  console.log('\n📍 Testing without store filter...');
  const allAddons = await testFetchAddonRecipes(null, headers);
  
  console.log('\n📊 Summary:');
  console.log(`   Sugbo Mercado addons: ${sugboAddons.length}`);
  console.log(`   All store addons: ${allAddons.length}`);
  
  if (sugboAddons.length > 0) {
    console.log('\n🎉 Addon service test successful!');
    console.log('✅ The addon dialog should now work properly');
  } else {
    console.log('\n❌ No addon items found - addon dialog may still have issues');
  }
}

testUpdatedAddonService().catch(console.error);
