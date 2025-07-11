#!/usr/bin/env node

/**
 * Cleanup Duplicate Categories Script
 * 
 * This script removes duplicate categories and ensures clean category structure.
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';

// Preferred category names (keep these, remove others)
const PREFERRED_CATEGORIES = [
  'Classic',
  'Add-ons', 
  'Beverages',
  'Espresso',
  'Croffle Overload',
  'Mini Croffle',
  'Combo'
];

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function cleanupDuplicateCategories() {
  console.log('🧹 Cleaning up duplicate categories...\n');
  
  const authOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: '/auth/v1/token?grant_type=password',
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  const authResult = await makeRequest(authOptions, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${authResult.access_token}`,
    'Content-Type': 'application/json'
  };
  
  // Focus on Sugbo Mercado store (where Tiramisu is)
  const storeId = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'; // Sugbo Mercado
  console.log('🏪 Cleaning categories for: Sugbo Mercado (IT Park, Cebu)');
  
  // Get all categories for this store
  const categoriesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/categories?select=*&store_id=eq.${storeId}&order=name`,
    method: 'GET',
    headers
  };
  
  const categories = await makeRequest(categoriesOptions);
  console.log(`\n📋 Found ${categories.length} categories:`);
  
  // Group categories by similar names
  const categoryGroups = new Map();
  
  categories.forEach(category => {
    const normalizedName = category.name.toLowerCase().replace(/[^a-z]/g, '');
    
    if (!categoryGroups.has(normalizedName)) {
      categoryGroups.set(normalizedName, []);
    }
    categoryGroups.get(normalizedName).push(category);
  });
  
  // Show groups
  for (const [normalizedName, group] of categoryGroups.entries()) {
    console.log(`\n🏷️ Group "${normalizedName}":`);
    group.forEach(cat => console.log(`   - "${cat.name}" (${cat.id})`));
    
    if (group.length > 1) {
      console.log(`   ⚠️ ${group.length} duplicates found!`);
      
      // Find the preferred category to keep
      let keepCategory = null;
      
      // First, try to find exact match with preferred names
      for (const preferred of PREFERRED_CATEGORIES) {
        const match = group.find(cat => cat.name === preferred);
        if (match) {
          keepCategory = match;
          break;
        }
      }
      
      // If no exact match, keep the capitalized version
      if (!keepCategory) {
        keepCategory = group.find(cat => cat.name[0] === cat.name[0].toUpperCase()) || group[0];
      }
      
      console.log(`   ✅ Keeping: "${keepCategory.name}" (${keepCategory.id})`);
      
      // Delete the duplicates
      const toDelete = group.filter(cat => cat.id !== keepCategory.id);
      
      for (const category of toDelete) {
        console.log(`   🗑️ Deleting: "${category.name}" (${category.id})`);
        
        const deleteOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/categories?id=eq.${category.id}`,
          method: 'DELETE',
          headers
        };
        
        try {
          await makeRequest(deleteOptions);
          console.log(`      ✅ Deleted successfully`);
        } catch (error) {
          console.log(`      ❌ Failed to delete: ${error.message}`);
        }
      }
    } else {
      console.log(`   ✅ No duplicates`);
    }
  }
  
  // Now check if Tiramisu has the correct category
  console.log('\n🔍 Checking Tiramisu category assignment...');
  
  const tiramisuOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/product_catalog?select=*,recipes(template_id,recipe_templates(category_name))&product_name=ilike.*tiramisu*&store_id=eq.${storeId}`,
    method: 'GET',
    headers
  };
  
  const tiramisuProducts = await makeRequest(tiramisuOptions);
  
  if (tiramisuProducts.length > 0) {
    const tiramisu = tiramisuProducts[0];
    const templateCategory = tiramisu.recipes?.recipe_templates?.category_name;
    
    console.log(`📦 Tiramisu found:`);
    console.log(`   Template category: "${templateCategory}"`);
    console.log(`   Current category_id: ${tiramisu.category_id || 'null'}`);
    
    // Find the "Classic" category
    const classicCategoryOptions = {
      hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
      port: 443,
      path: `/rest/v1/categories?select=*&store_id=eq.${storeId}&name=eq.Classic&is_active=eq.true`,
      method: 'GET',
      headers
    };
    
    const classicCategories = await makeRequest(classicCategoryOptions);
    
    if (classicCategories.length > 0) {
      const classicCategory = classicCategories[0];
      console.log(`   Target category: "${classicCategory.name}" (${classicCategory.id})`);
      
      if (tiramisu.category_id !== classicCategory.id) {
        console.log(`   🔄 Updating Tiramisu category...`);
        
        const updateOptions = {
          hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
          port: 443,
          path: `/rest/v1/product_catalog?id=eq.${tiramisu.id}`,
          method: 'PATCH',
          headers
        };
        
        try {
          await makeRequest(updateOptions, { category_id: classicCategory.id });
          console.log(`   ✅ Tiramisu category updated to "Classic"`);
        } catch (error) {
          console.log(`   ❌ Failed to update: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Tiramisu already has correct category`);
      }
    } else {
      console.log(`   ❌ "Classic" category not found`);
    }
  } else {
    console.log(`❌ Tiramisu not found`);
  }
  
  // Show final category list
  console.log('\n📋 Final category list:');
  const finalCategoriesOptions = {
    hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
    port: 443,
    path: `/rest/v1/categories?select=*&store_id=eq.${storeId}&is_active=eq.true&order=name`,
    method: 'GET',
    headers
  };
  
  const finalCategories = await makeRequest(finalCategoriesOptions);
  finalCategories.forEach(cat => console.log(`   - ${cat.name} (${cat.id})`));
  
  console.log('\n✅ Category cleanup complete!');
  console.log('💡 Please refresh the POS to see the cleaned categories.');
}

cleanupDuplicateCategories().catch(console.error);
