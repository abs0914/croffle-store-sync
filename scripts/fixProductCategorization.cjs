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

async function fixProductCategorization() {
  console.log('🔧 Fixing Product Categorization...\n');
  
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
  console.log(`Found ${stores.length} stores\n`);

  // For each store, fix the categorization
  for (const store of stores) {
    console.log(`📍 Processing store: ${store.name} (${store.id})`);
    
    // Get the Combo category ID for this store
    const comboCategoryOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/categories?select=id,name&store_id=eq.${store.id}&name=eq.Combo&is_active=eq.true`,
      method: 'GET',
      headers
    };
    
    const comboCategories = await makeRequest(comboCategoryOptions);
    
    if (comboCategories.length === 0) {
      console.log(`   ❌ No Combo category found for ${store.name}`);
      continue;
    }
    
    const comboCategoryId = comboCategories[0].id;
    console.log(`   ✅ Found Combo category: ${comboCategoryId}`);

    // Find products that need to be moved to Combo category
    const productsToMoveOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/product_catalog?select=id,product_name,category_id,categories(name)&store_id=eq.${store.id}&or=(product_name.ilike.%2AMini%20Croffle%2A,product_name.ilike.%2ACroffle%20Overload%2A)`,
      method: 'GET',
      headers
    };
    
    const productsToMove = await makeRequest(productsToMoveOptions);
    console.log(`   📦 Found ${productsToMove.length} products to move:`);

    let movedCount = 0;
    for (const product of productsToMove) {
      const currentCategory = product.categories?.name || 'No Category';
      
      // Skip if already in Combo category
      if (product.category_id === comboCategoryId) {
        console.log(`      ✅ ${product.product_name}: Already in Combo category`);
        continue;
      }

      console.log(`      🔄 Moving ${product.product_name}: "${currentCategory}" → "Combo"`);
      
      // Update the product category
      const updateOptions = {
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_catalog?id=eq.${product.id}`,
        method: 'PATCH',
        headers
      };
      
      try {
        await makeRequest(updateOptions, { category_id: comboCategoryId });
        console.log(`      ✅ Successfully moved ${product.product_name}`);
        movedCount++;
      } catch (error) {
        console.log(`      ❌ Failed to move ${product.product_name}: ${error.message}`);
      }
    }

    console.log(`   📊 Moved ${movedCount} products to Combo category\n`);
  }

  console.log('✅ Product categorization fix complete!');
}

fixProductCategorization().catch(console.error);
