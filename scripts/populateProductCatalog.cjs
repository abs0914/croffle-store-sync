#!/usr/bin/env node

/**
 * Populate Product Catalog
 * 
 * This script creates product_catalog entries from existing products.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

let headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : null;
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${result?.message || body}`));
          } else {
            resolve(result);
          }
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

async function authenticateAdmin() {
  console.log('🔐 Authenticating admin user...');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  const authResult = await makeRequest(authOptions, authData);
  
  if (authResult.access_token) {
    headers.Authorization = `Bearer ${authResult.access_token}`;
    console.log('✅ Admin authenticated successfully');
  } else {
    throw new Error('Authentication failed');
  }
}

async function populateProductCatalog() {
  console.log('📦 Getting products to populate catalog...');
  
  // Get all active products
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/products?select=id,store_id,name,description,price,recipe_id,image_url,category_id&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`   Found ${products.length} products to add to catalog`);
  
  let createdCount = 0;
  let skippedCount = 0;
  
  // Process products in batches
  const batchSize = 10;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    for (const product of batch) {
      try {
        // Check if catalog entry already exists
        const checkOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?select=id&store_id=eq.${product.store_id}&product_name=eq.${encodeURIComponent(product.name)}`,
          method: 'GET',
          headers
        };
        
        const existing = await makeRequest(checkOptions);
        
        if (existing.length > 0) {
          skippedCount++;
          continue;
        }
        
        // Create catalog entry
        const catalogData = {
          store_id: product.store_id,
          product_name: product.name,
          description: product.description || `Delicious ${product.name} made fresh to order`,
          price: product.price || 25,
          recipe_id: product.recipe_id,
          image_url: product.image_url,
          category_id: product.category_id,
          is_available: true,
          display_order: 0
        };
        
        const createOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: '/rest/v1/product_catalog',
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' }
        };
        
        await makeRequest(createOptions, catalogData);
        createdCount++;
        
        console.log(`   ✅ Added ${product.name} to catalog`);
        
      } catch (error) {
        console.log(`   ❌ Failed to add ${product.name}: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Delay between batches
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📊 Catalog population complete:`);
  console.log(`   Created: ${createdCount} entries`);
  console.log(`   Skipped: ${skippedCount} entries`);
  
  return { created: createdCount, skipped: skippedCount };
}

async function verifyProductCatalog() {
  console.log('\n🔍 Verifying product catalog...');
  
  const catalogOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=store_id,product_name,price&is_available=eq.true',
    method: 'GET',
    headers
  };
  
  const catalog = await makeRequest(catalogOptions);
  
  // Group by store
  const catalogByStore = {};
  catalog.forEach(item => {
    const storeId = item.store_id;
    if (!catalogByStore[storeId]) {
      catalogByStore[storeId] = [];
    }
    catalogByStore[storeId].push(item.product_name);
  });
  
  console.log(`📊 Product Catalog Status:`);
  console.log(`   Total catalog entries: ${catalog.length}`);
  console.log(`   Stores with catalog: ${Object.keys(catalogByStore).length}`);
  
  Object.entries(catalogByStore).forEach(([storeId, products]) => {
    console.log(`   Store ${storeId}: ${products.length} products`);
  });
  
  return {
    totalEntries: catalog.length,
    storesWithCatalog: Object.keys(catalogByStore).length
  };
}

async function main() {
  try {
    console.log('🚀 POPULATING PRODUCT CATALOG');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Step 1: Populate product catalog from products
    const populateResult = await populateProductCatalog();
    
    // Step 2: Verify the catalog
    const verification = await verifyProductCatalog();
    
    console.log('\n🎉 PRODUCT CATALOG POPULATION COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📦 Catalog entries created: ${populateResult.created}`);
    console.log(`⏭️ Entries skipped: ${populateResult.skipped}`);
    console.log(`📊 Total catalog entries: ${verification.totalEntries}`);
    console.log(`🏪 Stores with catalog: ${verification.storesWithCatalog}`);
    
    if (verification.totalEntries > 0) {
      console.log('\n🎯 SUCCESS: Product catalog is now populated!');
      console.log('   All products are ready for POS integration.');
    } else {
      console.log('\n⚠️  WARNING: Product catalog population failed.');
    }
    
  } catch (error) {
    console.error('❌ Population failed:', error.message);
    process.exit(1);
  }
}

main();
