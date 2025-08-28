-- =====================================================
-- DEPRECATED SCRIPT - DO NOT USE
-- =====================================================
-- 
-- This script has been deprecated and replaced by the unified system.
-- 
-- Reason: Functionality moved to database/setup/ scripts
-- 
-- Replacement: Use the scripts in database/setup/ instead
-- 
-- For new installations:
-- 1. Run database/setup/01_unified_recipe_system.sql
-- 2. Run database/setup/02_essential_functions.sql
-- 3. Use the Unified Recipe Import Dialog in the application
-- 
-- This file is kept for historical reference only.
-- =====================================================

-- Original content preserved below for reference:
-- (Content has been commented out to prevent accidental execution)

-- #!/usr/bin/env node

-- /**
--  * Apply Database Updates
--  * 
--  * This script applies the necessary database updates for the unified recipe management system.
--  */

-- const https = require('https');
-- const fs = require('fs');

-- const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc';
-- const ADMIN_EMAIL = 'admin@example.com';
-- const ADMIN_PASSWORD = 'password123';

-- let headers = {
--   'Content-Type': 'application/json',
--   'apikey': SUPABASE_ANON_KEY,
--   'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
-- };

-- function makeRequest(options, data = null) {
--   return new Promise((resolve, reject) => {
--     const req = https.request(options, (res) => {
--       let body = '';
--       res.on('data', (chunk) => body += chunk);
--       res.on('end', () => {
--         try {
--           const result = body ? JSON.parse(body) : null;
--           if (res.statusCode >= 400) {
--             reject(new Error(`HTTP ${res.statusCode}: ${result?.message || body}`));
--           } else {
--             resolve(result);
--           }
--         } catch (e) {
--           resolve(body);
--         }
--       });
--     });

--     req.on('error', reject);
    
--     if (data) {
--       req.write(JSON.stringify(data));
--     }
    
--     req.end();
--   });
-- }

-- async function authenticateAdmin() {
--   console.log('🔐 Authenticating admin user...');
  
--   const authOptions = {
--     hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--     port: 443,
--     path: '/auth/v1/token?grant_type=password',
--     method: 'POST',
--     headers: {
--       'Content-Type': 'application/json',
--       'apikey': SUPABASE_ANON_KEY
--     }
--   };

--   const authData = {
--     email: ADMIN_EMAIL,
--     password: ADMIN_PASSWORD
--   };

--   const authResult = await makeRequest(authOptions, authData);
  
--   if (authResult.access_token) {
--     headers.Authorization = `Bearer ${authResult.access_token}`;
--     console.log('✅ Admin authenticated successfully');
--   } else {
--     throw new Error('Authentication failed');
--   }
-- }

-- async function createStandardCategories() {
--   console.log('🏷️ Creating standard categories...');
  
--   // Get all stores
--   const storesOptions = {
--     hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--     port: 443,
--     path: '/rest/v1/stores?select=id,name&is_active=eq.true',
--     method: 'GET',
--     headers
--   };
  
--   const stores = await makeRequest(storesOptions);
--   console.log(`   Found ${stores.length} active stores`);
  
--   const standardCategories = [
--     'Premium', 'Fruity', 'Classic', 'Combo', 'Mini Croffle', 
--     'Croffle Overload', 'Add-ons', 'Espresso', 'Beverages', 
--     'Blended', 'Cold Beverages', 'Glaze', 'Mix & Match'
--   ];
  
--   let created = 0;
--   let existing = 0;
  
--   for (const store of stores) {
--     for (const categoryName of standardCategories) {
--       // Check if category exists
--       const checkOptions = {
--         hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--         port: 443,
--         path: `/rest/v1/categories?select=id&store_id=eq.${store.id}&name=eq.${encodeURIComponent(categoryName)}&is_active=eq.true`,
--         method: 'GET',
--         headers
--       };
      
--       const existingCategories = await makeRequest(checkOptions);
      
--       if (existingCategories.length === 0) {
--         // Create category
--         const createOptions = {
--           hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--           port: 443,
--           path: '/rest/v1/categories',
--           method: 'POST',
--           headers: { ...headers, 'Prefer': 'return=minimal' }
--         };
        
--         const categoryData = {
--           store_id: store.id,
--           name: categoryName,
--           description: `Category for ${categoryName} items`,
--           is_active: true
--         };
        
--         try {
--           await makeRequest(createOptions, categoryData);
--           created++;
--         } catch (error) {
--           console.log(`      ❌ Failed to create ${categoryName} for ${store.name}: ${error.message}`);
--         }
--       } else {
--         existing++;
--       }
--     }
--   }
  
--   console.log(`   ✅ Categories: ${created} created, ${existing} already existed`);
-- }

-- async function updateProductCatalogCategories() {
--   console.log('📦 Updating product catalog categories...');
  
--   // Category mapping
--   const categoryMapping = {
--     'premium': 'Premium',
--     'fruity': 'Fruity',
--     'classic': 'Classic',
--     'combo': 'Combo',
--     'mini_croffle': 'Mini Croffle',
--     'croffle_overload': 'Croffle Overload',
--     'add-on': 'Add-ons',
--     'addon': 'Add-ons',
--     'espresso': 'Espresso',
--     'beverages': 'Beverages',
--     'blended': 'Blended',
--     'cold': 'Cold Beverages',
--     'glaze': 'Glaze',
--     'mix & match': 'Mix & Match',
--     'croffles': 'Classic',
--     'drinks': 'Beverages',
--     'add-ons': 'Add-ons',
--     'combos': 'Combo'
--   };
  
--   // Get product catalog entries without categories that have recipe links
--   const productsOptions = {
--     hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--     port: 443,
--     path: '/rest/v1/product_catalog?select=id,store_id,product_name,recipe_id,recipes(template_id,recipe_templates(category_name))&recipe_id=not.is.null&category_id=is.null',
--     method: 'GET',
--     headers
--   };
  
--   const products = await makeRequest(productsOptions);
--   console.log(`   Found ${products.length} products needing category assignment`);
  
--   let updated = 0;
--   let errors = 0;
  
--   for (const product of products) {
--     try {
--       const templateCategory = product.recipes?.recipe_templates?.category_name;
--       if (!templateCategory) continue;
      
--       const posCategory = categoryMapping[templateCategory.toLowerCase()] || 'Classic';
      
--       // Get category ID
--       const categoryOptions = {
--         hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--         port: 443,
--         path: `/rest/v1/categories?select=id&store_id=eq.${product.store_id}&name=eq.${encodeURIComponent(posCategory)}&is_active=eq.true`,
--         method: 'GET',
--         headers
--       };
      
--       const categories = await makeRequest(categoryOptions);
--       if (categories.length === 0) continue;
      
--       // Update product catalog entry
--       const updateOptions = {
--         hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--         port: 443,
--         path: `/rest/v1/product_catalog?id=eq.${product.id}`,
--         method: 'PATCH',
--         headers: { ...headers, 'Prefer': 'return=minimal' }
--       };
      
--       await makeRequest(updateOptions, { category_id: categories[0].id });
--       updated++;
      
--     } catch (error) {
--       errors++;
--     }
--   }
  
--   console.log(`   ✅ Updated ${updated} products, ${errors} errors`);
-- }

-- async function verifySystem() {
--   console.log('🔍 Verifying system status...');
  
--   try {
--     // Get overall statistics
--     const [templates, recipes, products, categories] = await Promise.all([
--       makeRequest({
--         hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--         port: 443,
--         path: '/rest/v1/recipe_templates?select=id&is_active=eq.true',
--         method: 'GET',
--         headers
--       }),
--       makeRequest({
--         hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--         port: 443,
--         path: '/rest/v1/recipes?select=id&is_active=eq.true',
--         method: 'GET',
--         headers
--       }),
--       makeRequest({
--         hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--         port: 443,
--         path: '/rest/v1/product_catalog?select=id,category_id&is_available=eq.true',
--         method: 'GET',
--         headers
--       }),
--       makeRequest({
--         hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--         port: 443,
--         path: '/rest/v1/categories?select=id&is_active=eq.true',
--         method: 'GET',
--         headers
--       })
--     ]);
    
--     const categorizedProducts = products.filter(p => p.category_id).length;
--     const uncategorizedProducts = products.length - categorizedProducts;
--     const categorizationRate = Math.round((categorizedProducts / products.length) * 100);
    
--     console.log('   📊 SYSTEM STATUS:');
--     console.log(`      Active Templates: ${templates.length}`);
--     console.log(`      Active Recipes: ${recipes.length}`);
--     console.log(`      Available Products: ${products.length}`);
--     console.log(`      Categorized Products: ${categorizedProducts} (${categorizationRate}%)`);
--     console.log(`      Uncategorized Products: ${uncategorizedProducts}`);
--     console.log(`      Total Categories: ${categories.length}`);
    
--     return categorizationRate >= 85;
    
--   } catch (error) {
--     console.log(`   ❌ Verification failed: ${error.message}`);
--     return false;
--   }
-- }

-- async function main() {
--   try {
--     console.log('🚀 APPLYING DATABASE UPDATES');
--     console.log('='.repeat(50));
    
--     await authenticateAdmin();
    
--     // Step 1: Create standard categories
--     await createStandardCategories();
    
--     // Step 2: Update product catalog categories
--     await updateProductCatalogCategories();
    
--     // Step 3: Verify system
--     const isHealthy = await verifySystem();
    
--     console.log('\n🎉 DATABASE UPDATES COMPLETE!');
--     console.log('='.repeat(50));
--     console.log(`✅ System health: ${isHealthy ? 'Good' : 'Needs attention'}`);
    
--     if (isHealthy) {
--       console.log('\n🎯 SUCCESS: Database is ready for the unified recipe system!');
--       console.log('   You can now use the new import dialog to manage recipes.');
--     } else {
--       console.log('\n⚠️ Some issues remain - check the logs above.');
--     }
    
--     console.log('\n📋 Next Steps:');
--     console.log('   1. Test the unified recipe import dialog');
--     console.log('   2. Import your CSV data using the new system');
--     console.log('   3. Verify that categories are properly assigned');
    
--   } catch (error) {
--     console.error('❌ Database update failed:', error.message);
--     process.exit(1);
--   }
-- }

-- main();
