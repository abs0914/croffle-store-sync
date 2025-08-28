#!/usr/bin/env node

/**
 * Fix Duplicate Products
 * 
 * This script identifies and resolves duplicate products that violate the 
 * unique constraint "products_store_id_sku_key" by either merging or removing duplicates.
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

async function findDuplicateProducts() {
  console.log('🔍 Finding duplicate products...');
  
  // Get all products grouped by store_id and sku to find duplicates
  const productsOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/products?select=id,store_id,sku,name,created_at,is_active&order=store_id,sku,created_at',
    method: 'GET',
    headers
  };
  
  const products = await makeRequest(productsOptions);
  console.log(`   Found ${products.length} total products`);
  
  // Group by store_id + sku to find duplicates
  const duplicateGroups = {};
  
  products.forEach(product => {
    const key = `${product.store_id}_${product.sku}`;
    if (!duplicateGroups[key]) {
      duplicateGroups[key] = [];
    }
    duplicateGroups[key].push(product);
  });
  
  // Filter to only groups with duplicates
  const duplicates = Object.entries(duplicateGroups)
    .filter(([key, group]) => group.length > 1)
    .map(([key, group]) => ({ key, products: group }));
  
  console.log(`   Found ${duplicates.length} duplicate groups affecting ${duplicates.reduce((sum, group) => sum + group.products.length, 0)} products`);
  
  return duplicates;
}

async function resolveDuplicates(duplicateGroups) {
  console.log('\n🔧 Resolving duplicate products...');
  
  let resolvedCount = 0;
  let errorCount = 0;
  
  for (const group of duplicateGroups) {
    try {
      const { key, products } = group;
      const [storeId, sku] = key.split('_');
      
      console.log(`\n   📦 Resolving duplicates for SKU "${sku}" in store ${storeId}:`);
      products.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.name} (${p.id}) - Created: ${p.created_at} - Active: ${p.is_active}`);
      });
      
      // Strategy: Keep the most recent active product, remove others
      const sortedProducts = products.sort((a, b) => {
        // Prioritize active products
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        // Then by creation date (most recent first)
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      const keepProduct = sortedProducts[0];
      const removeProducts = sortedProducts.slice(1);
      
      console.log(`      ✅ Keeping: ${keepProduct.name} (${keepProduct.id})`);
      
      // Remove duplicate products
      for (const product of removeProducts) {
        console.log(`      🗑️ Removing: ${product.name} (${product.id})`);
        
        const deleteOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/products?id=eq.${product.id}`,
          method: 'DELETE',
          headers
        };
        
        try {
          await makeRequest(deleteOptions);
          console.log(`         ✅ Deleted successfully`);
        } catch (error) {
          console.log(`         ❌ Delete failed: ${error.message}`);
          errorCount++;
        }
      }
      
      resolvedCount++;
      
    } catch (error) {
      console.log(`   ❌ Error resolving group ${group.key}: ${error.message}`);
      errorCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Duplicate resolution results:`);
  console.log(`   Groups resolved: ${resolvedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  return { resolved: resolvedCount, errors: errorCount };
}

async function verifyNoDuplicates() {
  console.log('\n🔍 Verifying no duplicates remain...');
  
  const duplicates = await findDuplicateProducts();
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate products found - constraint violations resolved!');
    return true;
  } else {
    console.log(`⚠️ ${duplicates.length} duplicate groups still exist`);
    return false;
  }
}

async function checkProductCatalogLinks() {
  console.log('\n🔗 Checking product catalog links...');
  
  // Check for product_catalog entries that might reference deleted products
  const catalogOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/rest/v1/product_catalog?select=id,product_name,recipe_id,recipes(id)',
    method: 'GET',
    headers
  };
  
  const catalogEntries = await makeRequest(catalogOptions);
  
  const brokenLinks = catalogEntries.filter(entry => 
    entry.recipe_id && !entry.recipes
  );
  
  if (brokenLinks.length > 0) {
    console.log(`⚠️ Found ${brokenLinks.length} product catalog entries with broken recipe links`);
    brokenLinks.slice(0, 5).forEach(entry => {
      console.log(`   - ${entry.product_name} (${entry.id}) -> recipe ${entry.recipe_id}`);
    });
    if (brokenLinks.length > 5) {
      console.log(`   ... and ${brokenLinks.length - 5} more`);
    }
  } else {
    console.log('✅ All product catalog recipe links are valid');
  }
  
  return brokenLinks.length;
}

async function main() {
  try {
    console.log('🚀 FIXING DUPLICATE PRODUCTS');
    console.log('='.repeat(50));
    
    await authenticateAdmin();
    
    // Step 1: Find duplicate products
    const duplicates = await findDuplicateProducts();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate products found!');
      return;
    }
    
    // Step 2: Resolve duplicates
    const results = await resolveDuplicates(duplicates);
    
    // Step 3: Verify resolution
    const isResolved = await verifyNoDuplicates();
    
    // Step 4: Check for any broken links
    const brokenLinks = await checkProductCatalogLinks();
    
    console.log('\n🎉 DUPLICATE RESOLUTION COMPLETE!');
    console.log('='.repeat(50));
    console.log(`🔧 Groups resolved: ${results.resolved}`);
    console.log(`❌ Errors: ${results.errors}`);
    console.log(`✅ Duplicates cleared: ${isResolved ? 'Yes' : 'No'}`);
    console.log(`🔗 Broken catalog links: ${brokenLinks}`);
    
    if (isResolved) {
      console.log('\n🎯 SUCCESS: Unique constraint violations resolved!');
      console.log('   You can now proceed with template cleanup operations.');
    } else {
      console.log('\n⚠️ Some duplicates may still exist - manual review needed.');
    }
    
  } catch (error) {
    console.error('❌ Duplicate fix failed:', error.message);
    process.exit(1);
  }
}

main();
