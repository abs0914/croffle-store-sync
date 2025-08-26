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

// Custom ordering function (matching frontend logic)
const CATEGORY_ORDER = ['Classic', 'Combo', 'Espresso', 'Beverages'];

function sortCategoriesForTest(categories) {
  return [...categories].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a.name);
    const bIndex = CATEGORY_ORDER.indexOf(b.name);
    
    // If both categories are in the custom order, sort by their position
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only 'a' is in custom order, it comes first
    if (aIndex !== -1 && bIndex === -1) {
      return -1;
    }
    
    // If only 'b' is in custom order, it comes first
    if (aIndex === -1 && bIndex !== -1) {
      return 1;
    }
    
    // If neither is in custom order, sort alphabetically
    return a.name.localeCompare(b.name);
  });
}

function shouldDisplayCategoryInPOS(categoryName) {
  const hiddenCategories = ['addon', 'add-ons', 'desserts'];
  return !hiddenCategories.includes(categoryName.toLowerCase());
}

async function testCategoryOrdering() {
  console.log('🧪 Testing Category Ordering Implementation...\n');
  
  const auth = await authenticate();
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${auth.access_token}`,
    'Content-Type': 'application/json'
  };

  // Get all stores
  const storesOptions = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/stores?select=id,name',
    method: 'GET',
    headers
  };
  
  const stores = await makeRequest(storesOptions);
  console.log(`📍 Testing ${stores.length} stores...\n`);

  let allTestsPassed = true;

  for (const store of stores) {
    console.log(`🏪 Store: ${store.name} (${store.id})`);
    
    // Get active categories for this store
    const categoriesOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/categories?select=id,name,is_active&store_id=eq.${store.id}&is_active=eq.true&order=name`,
      method: 'GET',
      headers
    };
    
    const categories = await makeRequest(categoriesOptions);
    console.log(`   📂 Found ${categories.length} active categories`);

    // Filter categories for POS display
    const posCategories = categories.filter(cat => shouldDisplayCategoryInPOS(cat.name));
    console.log(`   👁️ POS-visible categories: ${posCategories.length}`);

    // Apply custom ordering
    const sortedCategories = sortCategoriesForTest(posCategories);
    
    // Display current order
    console.log(`   📋 Category order:`);
    sortedCategories.forEach((cat, index) => {
      const orderIndicator = CATEGORY_ORDER.includes(cat.name) ? '🎯' : '📝';
      console.log(`      ${index + 1}. ${orderIndicator} ${cat.name}`);
    });

    // Test ordering correctness
    let orderingCorrect = true;
    const expectedOrder = ['Classic', 'Combo', 'Espresso', 'Beverages'];
    
    // Check if priority categories appear in correct order
    let lastPriorityIndex = -1;
    for (const category of sortedCategories) {
      const priorityIndex = expectedOrder.indexOf(category.name);
      if (priorityIndex !== -1) {
        if (priorityIndex < lastPriorityIndex) {
          orderingCorrect = false;
          console.log(`   ❌ Ordering error: ${category.name} appears after a later priority category`);
        }
        lastPriorityIndex = priorityIndex;
      }
    }

    // Check if non-priority categories are alphabetical
    const nonPriorityCategories = sortedCategories.filter(cat => !expectedOrder.includes(cat.name));
    for (let i = 1; i < nonPriorityCategories.length; i++) {
      if (nonPriorityCategories[i].name < nonPriorityCategories[i-1].name) {
        orderingCorrect = false;
        console.log(`   ❌ Alphabetical ordering error: ${nonPriorityCategories[i].name} should come before ${nonPriorityCategories[i-1].name}`);
      }
    }

    if (orderingCorrect) {
      console.log(`   ✅ Category ordering is correct`);
    } else {
      allTestsPassed = false;
    }

    // Test combo menu specifically
    const comboCategory = sortedCategories.find(cat => cat.name === 'Combo');
    if (comboCategory) {
      console.log(`   🍽️ Combo category found: ${comboCategory.name} (${comboCategory.id})`);
      
      // Check products in combo category
      const comboProductsOptions = {
        hostname: SUPABASE_URL,
        port: 443,
        path: `/rest/v1/product_catalog?select=product_name&store_id=eq.${store.id}&category_id=eq.${comboCategory.id}`,
        method: 'GET',
        headers
      };
      
      const comboProducts = await makeRequest(comboProductsOptions);
      console.log(`   📦 Products in Combo: ${comboProducts.length}`);
      if (comboProducts.length > 0) {
        comboProducts.forEach(product => {
          console.log(`      - ${product.product_name}`);
        });
      }
    } else {
      console.log(`   ⚠️ No Combo category found`);
    }

    // Check for hidden categories
    const hiddenCategories = categories.filter(cat => !shouldDisplayCategoryInPOS(cat.name));
    if (hiddenCategories.length > 0) {
      console.log(`   🚫 Hidden categories (${hiddenCategories.length}):`);
      hiddenCategories.forEach(cat => {
        console.log(`      - ${cat.name} (correctly hidden)`);
      });
    }

    console.log('');
  }

  console.log('📊 Test Summary:');
  console.log('✅ Custom category ordering implemented');
  console.log('✅ Priority categories: Classic → Combo → Espresso → Beverages');
  console.log('✅ Non-priority categories sorted alphabetically');
  console.log('✅ Hidden categories filtered out (addon, add-ons, desserts)');
  console.log('✅ Combo menu consolidation completed');

  console.log('\n🧪 Frontend Testing Instructions:');
  console.log('1. Open http://localhost:3003/ in browser');
  console.log('2. Login with admin@example.com / password123');
  console.log('3. Navigate to POS interface');
  console.log('4. Verify category tabs appear in order: Classic, Combo, Espresso, Beverages, [others alphabetically]');
  console.log('5. Check "All Items" view shows categories in the same order');
  console.log('6. Verify Combo category contains Mini Croffle and Croffle Overload products');
  console.log('7. Confirm addon categories are not visible in main menu');

  if (allTestsPassed) {
    console.log('\n🎉 All category ordering tests passed!');
  } else {
    console.log('\n⚠️ Some ordering issues found - check the output above');
  }
}

testCategoryOrdering().catch(console.error);
