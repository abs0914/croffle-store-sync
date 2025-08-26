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

// Simulate the updated categorization logic
function getCategoryKey(addon) {
  const categoryName = addon.category.toLowerCase();
  
  if (categoryName.includes('add-on') || categoryName.includes('addon')) {
    return 'addons';
  } else if (categoryName.includes('topping')) {
    return 'toppings';
  } else if (categoryName.includes('sauce')) {
    return 'sauces';
  } else if (categoryName.includes('biscuit')) {
    return 'biscuits';
  } else {
    return 'other';
  }
}

function getCategoryDisplayName(categoryKey) {
  const displayNames = {
    'addons': 'Add-ons',
    'toppings': 'Toppings',
    'sauces': 'Sauces',
    'biscuits': 'Biscuits',
    'other': 'Other'
  };
  
  return displayNames[categoryKey] || categoryKey;
}

function groupAddonsByCategory(addons) {
  const categories = new Map();

  addons.forEach(addon => {
    const categoryKey = getCategoryKey(addon);
    if (!categories.has(categoryKey)) {
      categories.set(categoryKey, []);
    }
    categories.get(categoryKey).push(addon);
  });

  return Array.from(categories.entries()).map(([key, items]) => ({
    name: key,
    display_name: getCategoryDisplayName(key),
    items: items.sort((a, b) => a.name.localeCompare(b.name))
  }));
}

async function testAddonCategorization() {
  console.log('🧪 Testing addon categorization...\n');
  
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
  
  // Fetch addon products
  const sugboStoreId = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: `/rest/v1/product_catalog?select=id,product_name,price,is_available,category_id,store_id,categories!inner(name)&is_available=eq.true&store_id=eq.${sugboStoreId}&order=product_name`,
    method: 'GET',
    headers
  };

  const allProducts = await makeRequest(options);

  if (!Array.isArray(allProducts)) {
    console.error('❌ Error fetching products:', allProducts);
    return;
  }

  // Filter addon products
  const addonProducts = allProducts.filter(product => {
    const categoryName = product.categories?.name?.toLowerCase() || '';
    return categoryName.includes('addon') || categoryName.includes('add-on');
  });

  console.log(`✅ Found ${addonProducts.length} addon products`);

  // Transform to addon items
  const addonItems = addonProducts.map(product => ({
    id: product.id,
    name: product.product_name,
    description: undefined,
    price: product.price || 6,
    cost_per_unit: (product.price || 6) * 0.6,
    category: product.categories?.name || 'addon',
    is_active: product.is_available,
    image_url: undefined
  }));

  console.log('\n📋 Raw addon items:');
  addonItems.forEach(item => {
    console.log(`   - ${item.name} (₱${item.price}) - Category: ${item.category}`);
  });

  // Test categorization
  console.log('\n🏷️ Testing categorization...');
  const categories = groupAddonsByCategory(addonItems);

  console.log(`✅ Created ${categories.length} categories:`);
  categories.forEach(cat => {
    console.log(`\n   📂 ${cat.display_name} (${cat.items.length} items):`);
    cat.items.forEach(item => {
      console.log(`      - ${item.name} (₱${item.price})`);
    });
  });

  console.log('\n🎉 Categorization test completed!');
}

testAddonCategorization().catch(console.error);
