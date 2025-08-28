-- =====================================================
-- COMPLETE CLEAR ALL PRODUCTS - NUCLEAR OPTION
-- =====================================================
-- 
-- This script clears EVERYTHING:
-- 1. Recipe data (templates, recipes)
-- 2. Product catalog entries 
-- 3. POS products (what customers see)
-- 4. Keeps categories intact for fresh import
--
-- ⚠️ WARNING: This will remove ALL products from POS!
-- Only run this if you want to start completely fresh.
--
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Find and disable ALL triggers on product_catalog
DO $$
DECLARE
  trigger_record RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Step 1: Disabling all triggers on product_catalog table...';
  
  -- Loop through all triggers on product_catalog table
  FOR trigger_record IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'product_catalog'::regclass
    AND NOT tgisinternal  -- Exclude internal triggers
  LOOP
    -- Disable each trigger
    EXECUTE format('ALTER TABLE product_catalog DISABLE TRIGGER %I', trigger_record.tgname);
    RAISE NOTICE 'Disabled trigger: %', trigger_record.tgname;
    trigger_count := trigger_count + 1;
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE 'No user triggers found on product_catalog table';
  ELSE
    RAISE NOTICE 'Disabled % triggers on product_catalog table', trigger_count;
  END IF;
END $$;

-- Step 2: Find and disable ALL triggers on products table
DO $$
DECLARE
  trigger_record RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Step 2: Disabling all triggers on products table...';
  
  -- Loop through all triggers on products table
  FOR trigger_record IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'products'::regclass
    AND NOT tgisinternal  -- Exclude internal triggers
  LOOP
    -- Disable each trigger
    EXECUTE format('ALTER TABLE products DISABLE TRIGGER %I', trigger_record.tgname);
    RAISE NOTICE 'Disabled trigger: %', trigger_record.tgname;
    trigger_count := trigger_count + 1;
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE 'No user triggers found on products table';
  ELSE
    RAISE NOTICE 'Disabled % triggers on products table', trigger_count;
  END IF;
END $$;

-- Step 3: Clear ALL product catalog entries
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE 'Step 3: Clearing ALL product catalog entries...';
  
  DELETE FROM product_catalog;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % product catalog entries', deleted_count;
END $$;

-- Step 4: Clear ALL POS products
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE 'Step 4: Clearing ALL POS products...';
  
  DELETE FROM products;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % POS products', deleted_count;
END $$;

-- Step 5: Clear recipe data
DO $$
DECLARE
  deleted_templates INTEGER;
  deleted_recipes INTEGER;
  deleted_template_ingredients INTEGER;
  deleted_recipe_ingredients INTEGER;
BEGIN
  RAISE NOTICE 'Step 5: Clearing recipe data...';
  
  -- Delete recipe template ingredients
  DELETE FROM recipe_template_ingredients;
  GET DIAGNOSTICS deleted_template_ingredients = ROW_COUNT;
  
  -- Delete recipe ingredients
  DELETE FROM recipe_ingredients;
  GET DIAGNOSTICS deleted_recipe_ingredients = ROW_COUNT;
  
  -- Delete recipes
  DELETE FROM recipes;
  GET DIAGNOSTICS deleted_recipes = ROW_COUNT;
  
  -- Delete recipe templates
  DELETE FROM recipe_templates;
  GET DIAGNOSTICS deleted_templates = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % recipe templates', deleted_templates;
  RAISE NOTICE 'Deleted % recipes', deleted_recipes;
  RAISE NOTICE 'Deleted % template ingredients', deleted_template_ingredients;
  RAISE NOTICE 'Deleted % recipe ingredients', deleted_recipe_ingredients;
END $$;

-- Step 6: Re-enable ALL triggers on product_catalog
DO $$
DECLARE
  trigger_record RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Step 6: Re-enabling all triggers on product_catalog table...';
  
  -- Loop through all triggers on product_catalog table
  FOR trigger_record IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'product_catalog'::regclass
    AND NOT tgisinternal  -- Exclude internal triggers
  LOOP
    -- Re-enable each trigger
    EXECUTE format('ALTER TABLE product_catalog ENABLE TRIGGER %I', trigger_record.tgname);
    RAISE NOTICE 'Re-enabled trigger: %', trigger_record.tgname;
    trigger_count := trigger_count + 1;
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE 'No user triggers to re-enable on product_catalog table';
  ELSE
    RAISE NOTICE 'Re-enabled % triggers on product_catalog table', trigger_count;
  END IF;
END $$;

-- Step 7: Re-enable ALL triggers on products table
DO $$
DECLARE
  trigger_record RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Step 7: Re-enabling all triggers on products table...';
  
  -- Loop through all triggers on products table
  FOR trigger_record IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'products'::regclass
    AND NOT tgisinternal  -- Exclude internal triggers
  LOOP
    -- Re-enable each trigger
    EXECUTE format('ALTER TABLE products ENABLE TRIGGER %I', trigger_record.tgname);
    RAISE NOTICE 'Re-enabled trigger: %', trigger_record.tgname;
    trigger_count := trigger_count + 1;
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE 'No user triggers to re-enable on products table';
  ELSE
    RAISE NOTICE 'Re-enabled % triggers on products table', trigger_count;
  END IF;
END $$;

-- Step 8: Verify complete clearing
DO $$
DECLARE
  remaining_templates INTEGER;
  remaining_recipes INTEGER;
  remaining_catalog INTEGER;
  remaining_products INTEGER;
  remaining_categories INTEGER;
BEGIN
  -- Count remaining data
  SELECT COUNT(*) INTO remaining_templates FROM recipe_templates;
  SELECT COUNT(*) INTO remaining_recipes FROM recipes;
  SELECT COUNT(*) INTO remaining_catalog FROM product_catalog;
  SELECT COUNT(*) INTO remaining_products FROM products;
  SELECT COUNT(*) INTO remaining_categories FROM categories WHERE is_active = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 COMPLETE SYSTEM CLEARING RESULTS!';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Recipe Templates: % (should be 0)', remaining_templates;
  RAISE NOTICE 'Recipes: % (should be 0)', remaining_recipes;
  RAISE NOTICE 'Product Catalog: % (should be 0)', remaining_catalog;
  RAISE NOTICE 'POS Products: % (should be 0)', remaining_products;
  RAISE NOTICE 'Categories: % (preserved for fresh import)', remaining_categories;
  
  IF remaining_templates = 0 AND remaining_recipes = 0 AND remaining_catalog = 0 AND remaining_products = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS: Complete system cleared successfully!';
    RAISE NOTICE '🚀 READY FOR COMPLETELY FRESH IMPORT!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was cleared:';
    RAISE NOTICE '✅ All recipe templates and recipes';
    RAISE NOTICE '✅ All product catalog entries';
    RAISE NOTICE '✅ All POS products (what customers see)';
    RAISE NOTICE '✅ All ingredient relationships';
    RAISE NOTICE '🏷️ Categories preserved for reuse';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '1. Go to Admin → Recipe Management in your application';
    RAISE NOTICE '2. Click "Import Recipes" to use the Unified Recipe Import Dialog';
    RAISE NOTICE '3. Upload your CSV file with exact category names';
    RAISE NOTICE '4. System will create fresh products with correct categories';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CATEGORY MAPPING IS NOW FIXED!';
    RAISE NOTICE 'Your CSV categories will be used exactly as provided:';
    RAISE NOTICE '- CSV "Add-on" → POS category "Add-on"';
    RAISE NOTICE '- CSV "Premium" → POS category "Premium"';
    RAISE NOTICE '- CSV "Cold" → POS category "Cold"';
    RAISE NOTICE '- No more mapping, no more conversion!';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Your POS will be empty until you import fresh data';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ WARNING: Some data may not have been cleared completely';
    RAISE NOTICE 'Templates: %, Recipes: %, Catalog: %, Products: %', 
                 remaining_templates, remaining_recipes, remaining_catalog, remaining_products;
  END IF;
END $$;

-- Final success message
SELECT 'COMPLETE SYSTEM CLEARED - POS IS NOW EMPTY - READY FOR FRESH IMPORT!' as status;
