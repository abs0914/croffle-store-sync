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

async function cleanupCategoryDuplicates() {
  console.log('🧹 Cleaning up Duplicate Categories...\n');
  
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
  console.log(`📍 Processing ${stores.length} stores...\n`);

  // Define the preferred category names (capitalized)
  const categoryMappings = {
    'classic': 'Classic',
    'beverages': 'Beverages', 
    'espresso': 'Espresso',
    'combo': 'Combo'
  };

  // Categories that should be deactivated (old separate categories)
  const categoriesToDeactivate = [
    'Croffle Overload',
    'croffle_overload', 
    'Mini Croffle',
    'mini_croffle',
    'Mini',
    'Overload'
  ];

  for (const store of stores) {
    console.log(`🏪 Store: ${store.name} (${store.id})`);
    
    // Get all categories for this store
    const categoriesOptions = {
      hostname: SUPABASE_URL,
      port: 443,
      path: `/rest/v1/categories?select=id,name,is_active&store_id=eq.${store.id}&order=name`,
      method: 'GET',
      headers
    };
    
    const categories = await makeRequest(categoriesOptions);
    console.log(`   📂 Found ${categories.length} categories`);

    // Process category mappings (merge duplicates)
    for (const [oldName, newName] of Object.entries(categoryMappings)) {
      const oldCategory = categories.find(c => c.name.toLowerCase() === oldName.toLowerCase() && c.name !== newName);
      const newCategory = categories.find(c => c.name === newName);

      if (oldCategory && newCategory) {
        console.log(`   🔄 Merging "${oldCategory.name}" → "${newName}"`);
        
        // Move products from old category to new category
        const moveProductsOptions = {
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/product_catalog?category_id=eq.${oldCategory.id}&store_id=eq.${store.id}`,
          method: 'PATCH',
          headers
        };
        
        try {
          await makeRequest(moveProductsOptions, { category_id: newCategory.id });
          console.log(`   ✅ Moved products from "${oldCategory.name}" to "${newName}"`);
          
          // Deactivate old category
          const deactivateOptions = {
            hostname: SUPABASE_URL,
            port: 443,
            path: `/rest/v1/categories?id=eq.${oldCategory.id}`,
            method: 'PATCH',
            headers
          };
          
          await makeRequest(deactivateOptions, { is_active: false });
          console.log(`   🗑️ Deactivated old category "${oldCategory.name}"`);
        } catch (error) {
          console.log(`   ❌ Error processing "${oldCategory.name}": ${error.message}`);
        }
      } else if (oldCategory && !newCategory) {
        console.log(`   🔄 Renaming "${oldCategory.name}" → "${newName}"`);
        
        // Rename the category
        const renameOptions = {
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/categories?id=eq.${oldCategory.id}`,
          method: 'PATCH',
          headers
        };
        
        try {
          await makeRequest(renameOptions, { name: newName });
          console.log(`   ✅ Renamed "${oldCategory.name}" to "${newName}"`);
        } catch (error) {
          console.log(`   ❌ Error renaming "${oldCategory.name}": ${error.message}`);
        }
      }
    }

    // Deactivate old combo-related categories
    for (const categoryName of categoriesToDeactivate) {
      const categoryToDeactivate = categories.find(c => c.name === categoryName && c.is_active);
      
      if (categoryToDeactivate) {
        console.log(`   🗑️ Deactivating old category "${categoryName}"`);
        
        // First move any products to Combo category
        const comboCategory = categories.find(c => c.name === 'Combo');
        if (comboCategory) {
          const moveProductsOptions = {
            hostname: SUPABASE_URL,
            port: 443,
            path: `/rest/v1/product_catalog?category_id=eq.${categoryToDeactivate.id}&store_id=eq.${store.id}`,
            method: 'PATCH',
            headers
          };
          
          try {
            await makeRequest(moveProductsOptions, { category_id: comboCategory.id });
            console.log(`   ✅ Moved products from "${categoryName}" to "Combo"`);
          } catch (error) {
            console.log(`   ❌ Error moving products from "${categoryName}": ${error.message}`);
          }
        }
        
        // Deactivate the category
        const deactivateOptions = {
          hostname: SUPABASE_URL,
          port: 443,
          path: `/rest/v1/categories?id=eq.${categoryToDeactivate.id}`,
          method: 'PATCH',
          headers
        };
        
        try {
          await makeRequest(deactivateOptions, { is_active: false });
          console.log(`   ✅ Deactivated "${categoryName}"`);
        } catch (error) {
          console.log(`   ❌ Error deactivating "${categoryName}": ${error.message}`);
        }
      }
    }

    console.log('');
  }

  console.log('✅ Category cleanup complete!');
}

cleanupCategoryDuplicates().catch(console.error);
