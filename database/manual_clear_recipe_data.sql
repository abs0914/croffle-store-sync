-- =====================================================
-- MANUAL CLEAR RECIPE DATA - TRIGGER-SAFE VERSION
-- =====================================================
-- 
-- This script manually clears all recipe data by temporarily disabling
-- the problematic trigger that causes constraint violations.
--
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Disable the problematic trigger temporarily
DO $$
BEGIN
  -- Check if the sync trigger exists and disable it
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_product_catalog_changes' 
    AND tgrelid = 'product_catalog'::regclass
  ) THEN
    ALTER TABLE product_catalog DISABLE TRIGGER trigger_sync_product_catalog_changes;
    RAISE NOTICE 'Disabled product sync trigger to prevent constraint violations';
  ELSE
    RAISE NOTICE 'Product sync trigger not found - proceeding without disabling';
  END IF;
END $$;

-- Step 2: Clear product catalog recipe references
UPDATE product_catalog 
SET recipe_id = NULL, updated_at = NOW()
WHERE recipe_id IS NOT NULL;

-- Step 3: Deactivate all recipes
UPDATE recipes 
SET is_active = false, updated_at = NOW()
WHERE is_active = true;

-- Step 4: Deactivate all recipe templates
UPDATE recipe_templates 
SET is_active = false, updated_at = NOW()
WHERE is_active = true;

-- Step 5: Re-enable the trigger
DO $$
BEGIN
  -- Re-enable the sync trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_sync_product_catalog_changes' 
    AND tgrelid = 'product_catalog'::regclass
  ) THEN
    ALTER TABLE product_catalog ENABLE TRIGGER trigger_sync_product_catalog_changes;
    RAISE NOTICE 'Re-enabled product sync trigger';
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
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ WARNING: Some data may not have been cleared completely';
    RAISE NOTICE 'You may need to manually investigate remaining data';
  END IF;
END $$;

-- Final success message
SELECT 'RECIPE DATA CLEARED - READY FOR FRESH IMPORT!' as status;
