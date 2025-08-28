#!/usr/bin/env node

/**
 * Deploy Product Catalog
 * 
 * This script deploys products to all stores and creates product catalog entries.
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

async function deployProductsToAllStores() {
  console.log('🚀 Deploying products to all stores...');
  
  const deployOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/rpc/deploy_products_to_all_stores',
    method: 'POST',
    headers
  };

  const result = await makeRequest(deployOptions, {});
  console.log('✅ Product deployment completed:', result[0]);
  
  return result[0];
}

async function migrateProductCatalog() {
  console.log('📦 Migrating product catalog to products table...');
  
  const migrateOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/rpc/migrate_product_catalog_to_products',
    method: 'POST',
    headers
  };

  const result = await makeRequest(migrateOptions, {});
  console.log('✅ Product catalog migration completed:', result[0]);
  
  return result[0];
}

async function verifyDeployment() {
  console.log('\n🔍 Verifying deployment...');
  
  // Check product catalog
  const catalogOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=store_id,product_name&is_available=eq.true',
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
  console.log(`   Stores with products: ${Object.keys(catalogByStore).length}`);
  
  Object.entries(catalogByStore).forEach(([storeId, products]) => {
    console.log(`   Store ${storeId}: ${products.length} products`);
  });
  
  // Check products table
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/products?select=store_id,name&is_active=eq.true',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  
  const productsByStore = {};
  products.forEach(item => {
    const storeId = item.store_id;
    if (!productsByStore[storeId]) {
      productsByStore[storeId] = [];
    }
    productsByStore[storeId].push(item.name);
  });
  
  console.log(`\n🛍️ Products Table Status:`);
  console.log(`   Total product entries: ${products.length}`);
  console.log(`   Stores with products: ${Object.keys(productsByStore).length}`);
  
  Object.entries(productsByStore).forEach(([storeId, prods]) => {
    console.log(`   Store ${storeId}: ${prods.length} products`);
  });
  
  return {
    catalogEntries: catalog.length,
    productEntries: products.length,
    storesWithCatalog: Object.keys(catalogByStore).length,
    storesWithProducts: Object.keys(productsByStore).length
  };
}

async function main() {
  try {
    console.log('🚀 DEPLOYING PRODUCT CATALOG');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Step 1: Deploy products to all stores
    const deployResult = await deployProductsToAllStores();
    
    // Step 2: Migrate product catalog to products table
    const migrateResult = await migrateProductCatalog();
    
    // Step 3: Verify deployment
    const verification = await verifyDeployment();
    
    console.log('\n🎉 PRODUCT CATALOG DEPLOYMENT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`📦 Products deployed: ${deployResult.deployed_count || 0}`);
    console.log(`🔄 Products migrated: ${migrateResult.migrated_count || 0}`);
    console.log(`📊 Total catalog entries: ${verification.catalogEntries}`);
    console.log(`🛍️ Total product entries: ${verification.productEntries}`);
    
    if (verification.catalogEntries > 0 && verification.productEntries > 0) {
      console.log('\n🎯 SUCCESS: Product catalog deployment complete!');
      console.log('   All stores should now have products ready for POS integration.');
    } else {
      console.log('\n⚠️  WARNING: Product catalog deployment may be incomplete.');
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

main();
