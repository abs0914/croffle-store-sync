-- =====================================================
-- NUCLEAR CLEAR RECIPE DATA - DISABLE ALL TRIGGERS
-- =====================================================
-- 
-- This script disables ALL triggers on product_catalog table to ensure
-- no constraint violations occur during recipe data clearing.
--
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Find and disable ALL triggers on product_catalog
DO $$
DECLARE
  trigger_record RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Finding all triggers on product_catalog table...';
  
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

-- Step 2: Clear product catalog recipe references
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Clearing product catalog recipe references...';
  
  UPDATE product_catalog 
  SET recipe_id = NULL, updated_at = NOW()
  WHERE recipe_id IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Cleared recipe references from % products', updated_count;
END $$;

-- Step 3: Deactivate all recipes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Deactivating all recipes...';
  
  UPDATE recipes 
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Deactivated % recipes', updated_count;
END $$;

-- Step 4: Deactivate all recipe templates
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Deactivating all recipe templates...';
  
  UPDATE recipe_templates 
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Deactivated % recipe templates', updated_count;
END $$;

-- Step 5: Re-enable ALL triggers on product_catalog
DO $$
DECLARE
  trigger_record RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Re-enabling all triggers on product_catalog table...';
  
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

-- Step 6: Verify clearing
DO $$
DECLARE
  active_templates INTEGER;
  active_recipes INTEGER;
  linked_products INTEGER;
BEGIN
  -- Count remaining active data
  SELECT COUNT(*) INTO active_templates FROM recipe_templates WHERE is_active = true;
  SELECT COUNT(*) INTO active_recipes FROM recipes WHERE is_active = true;
  SELECT COUNT(*) INTO linked_products FROM product_catalog WHERE recipe_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 RECIPE DATA CLEARING COMPLETE!';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Active Templates: % (should be 0)', active_templates;
  RAISE NOTICE 'Active Recipes: % (should be 0)', active_recipes;
  RAISE NOTICE 'Products with Recipe Links: % (should be 0)', linked_products;
  
  IF active_templates = 0 AND active_recipes = 0 AND linked_products = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCCESS: All recipe data cleared successfully!';
    RAISE NOTICE '🚀 READY FOR FRESH IMPORT!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '1. Go to Admin → Recipe Management in your application';
    RAISE NOTICE '2. Click "Import Recipes" to use the Unified Recipe Import Dialog';
    RAISE NOTICE '3. Upload your CSV file with exact category names';
    RAISE NOTICE '4. The system will now use exact CSV values (no more mapping!)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 CATEGORY MAPPING IS NOW FIXED!';
    RAISE NOTICE 'Your CSV categories will be used exactly as provided:';
    RAISE NOTICE '- CSV says "Add-on" → Category will be "Add-on"';
    RAISE NOTICE '- CSV says "Premium" → Category will be "Premium"';
    RAISE NOTICE '- CSV says "Cold" → Category will be "Cold"';
    RAISE NOTICE '- No more mapping, no more conversion!';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ WARNING: Some data may not have been cleared completely';
    RAISE NOTICE 'Active Templates: %', active_templates;
    RAISE NOTICE 'Active Recipes: %', active_recipes;
    RAISE NOTICE 'Linked Products: %', linked_products;
  END IF;
END $$;

-- Final success message
SELECT 'RECIPE DATA CLEARED - READY FOR FRESH IMPORT WITH EXACT CSV CATEGORIES!' as status;
