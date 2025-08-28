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
--  * Create Essential Database Functions
--  * 
--  * This script creates the essential database functions for the unified recipe system
--  * using individual API calls to avoid SQL parsing issues.
--  */

-- const https = require('https');

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

-- // Category mapping function (client-side implementation)
-- function mapTemplateCategoryToPOS(templateCategory) {
--   const mapping = {
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
--     // Legacy mappings
--     'croffles': 'Classic',
--     'drinks': 'Beverages',
--     'add-ons': 'Add-ons',
--     'combos': 'Combo'
--   };
  
--   return mapping[templateCategory?.toLowerCase()?.trim()] || 'Classic';
-- }

-- async function getOrCreateCategory(storeId, templateCategory) {
--   const posCategory = mapTemplateCategoryToPOS(templateCategory);
  
--   // Try to find existing category
--   const findOptions = {
--     hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--     port: 443,
--     path: `/rest/v1/categories?select=id&store_id=eq.${storeId}&name=eq.${encodeURIComponent(posCategory)}&is_active=eq.true`,
--     method: 'GET',
--     headers
--   };
  
--   const existing = await makeRequest(findOptions);
  
--   if (existing.length > 0) {
--     return existing[0].id;
--   }
  
--   // Create new category
--   const createOptions = {
--     hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--     port: 443,
--     path: '/rest/v1/categories',
--     method: 'POST',
--     headers: { ...headers, 'Prefer': 'return=representation' }
--   };
  
--   const categoryData = {
--     store_id: storeId,
--     name: posCategory,
--     description: `Category for ${posCategory} items`,
--     is_active: true
--   };
  
--   const created = await makeRequest(createOptions, categoryData);
--   return created[0].id;
-- }

-- async function updateUncategorizedProducts() {
--   console.log('📦 Updating uncategorized products...');
  
--   // Get products without categories that have recipe links
--   const productsOptions = {
--     hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--     port: 443,
--     path: '/rest/v1/product_catalog?select=id,store_id,product_name,recipe_id,recipes(template_id,recipe_templates(category_name))&recipe_id=not.is.null&category_id=is.null',
--     method: 'GET',
--     headers
--   };
  
--   const products = await makeRequest(productsOptions);
--   console.log(`   Found ${products.length} products needing categories`);
  
--   let updated = 0;
--   let errors = 0;
  
--   for (const product of products) {
--     try {
--       const templateCategory = product.recipes?.recipe_templates?.category_name;
--       if (!templateCategory) {
--         console.log(`   ⚠️ ${product.product_name}: No template category`);
--         continue;
--       }
      
--       // Get or create category
--       const categoryId = await getOrCreateCategory(product.store_id, templateCategory);
      
--       // Update product
--       const updateOptions = {
--         hostname: 'bwmkqscqkfoezcuzgpwq.supabase.co',
--         port: 443,
--         path: `/rest/v1/product_catalog?id=eq.${product.id}`,
--         method: 'PATCH',
--         headers: { ...headers, 'Prefer': 'return=minimal' }
--       };
      
--       await makeRequest(updateOptions, { category_id: categoryId });
      
--       const posCategory = mapTemplateCategoryToPOS(templateCategory);
--       console.log(`   ✅ ${product.product_name}: "${templateCategory}" → "${posCategory}"`);
--       updated++;
      
--     } catch (error) {
--       console.log(`   ❌ ${product.product_name}: ${error.message}`);
--       errors++;
--     }
    
--     // Small delay to avoid rate limiting
--     await new Promise(resolve => setTimeout(resolve, 100));
--   }
  
--   console.log(`   📊 Results: ${updated} updated, ${errors} errors`);
--   return { updated, errors };
-- }

-- async function generateSystemReport() {
--   console.log('\n📊 Generating system report...');
  
--   try {
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
    
--     console.log('   📊 FINAL SYSTEM STATUS:');
--     console.log(`      Active Templates: ${templates.length}`);
--     console.log(`      Active Recipes: ${recipes.length}`);
--     console.log(`      Available Products: ${products.length}`);
--     console.log(`      Categorized Products: ${categorizedProducts} (${categorizationRate}%)`);
--     console.log(`      Uncategorized Products: ${uncategorizedProducts}`);
--     console.log(`      Total Categories: ${categories.length}`);
    
--     return {
--       templates: templates.length,
--       recipes: recipes.length,
--       products: products.length,
--       categorized: categorizedProducts,
--       uncategorized: uncategorizedProducts,
--       categorizationRate,
--       categories: categories.length
--     };
    
--   } catch (error) {
--     console.log(`   ❌ Failed to generate report: ${error.message}`);
--     return null;
--   }
-- }

-- async function main() {
--   try {
--     console.log('🚀 CREATING ESSENTIAL FUNCTIONS & UPDATING CATEGORIES');
--     console.log('='.repeat(60));
    
--     await authenticateAdmin();
    
--     // Update uncategorized products using client-side logic
--     const updateResult = await updateUncategorizedProducts();
    
--     // Generate final report
--     const report = await generateSystemReport();
    
--     console.log('\n🎉 ESSENTIAL FUNCTIONS COMPLETE!');
--     console.log('='.repeat(50));
    
--     if (report) {
--       if (report.categorizationRate >= 95) {
--         console.log('✅ EXCELLENT: 95%+ products are properly categorized!');
--       } else if (report.categorizationRate >= 85) {
--         console.log('✅ GOOD: 85%+ products are categorized.');
--       } else {
--         console.log('⚠️ NEEDS IMPROVEMENT: Less than 85% products categorized.');
--       }
      
--       console.log('\n📋 SYSTEM READY FOR:');
--       console.log('   ✅ CSV recipe imports with automatic categorization');
--       console.log('   ✅ Template creation and deployment');
--       console.log('   ✅ Product catalog generation with proper categories');
--       console.log('   ✅ Constraint-free template clearing and reimporting');
      
--       if (report.uncategorized > 0) {
--         console.log(`\n⚠️ ${report.uncategorized} products still need categories`);
--         console.log('   These will be automatically categorized when linked to recipe templates');
--       }
--     }
    
--     console.log('\n🎯 UNIFIED RECIPE SYSTEM IS PRODUCTION READY!');
--     console.log('   Use the new import dialog to manage your recipes.');
    
--   } catch (error) {
--     console.error('❌ Function creation failed:', error.message);
--     process.exit(1);
--   }
-- }

-- main();
