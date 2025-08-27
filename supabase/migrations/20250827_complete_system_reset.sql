-- =====================================================
-- COMPLETE SYSTEM RESET FOR CROFFLE STORE SYNC
-- =====================================================
-- This migration performs a comprehensive reset of all recipe, inventory, 
-- and product catalog data while preserving essential system data like 
-- stores, users, and basic configuration.
--
-- IMPORTANT: This is a destructive operation. Ensure you have backups!
-- =====================================================

-- Step 1: Create backup tables for critical data before deletion
-- =====================================================

-- Backup stores data (we want to preserve this)
CREATE TABLE IF NOT EXISTS stores_backup_reset AS 
SELECT * FROM stores WHERE is_active = true;

-- Backup users data (we want to preserve this)
CREATE TABLE IF NOT EXISTS app_users_backup_reset AS 
SELECT * FROM app_users WHERE is_active = true;

-- Backup categories that should be preserved
CREATE TABLE IF NOT EXISTS categories_backup_reset AS 
SELECT * FROM categories WHERE is_active = true;

-- Step 2: Clear all recipe-related data in correct order
-- =====================================================

-- Clear product catalog entries (depends on recipes)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_catalog') THEN
    DELETE FROM product_catalog;
  END IF;
END $$;

-- Clear recipe deployment tracking (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_deployments') THEN
    DELETE FROM recipe_deployments WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear recipe ingredient mappings (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_ingredient_mappings') THEN
    DELETE FROM recipe_ingredient_mappings WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear recipe ingredients (child of recipes)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_ingredients') THEN
    DELETE FROM recipe_ingredients WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear unified recipe ingredients if exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_recipe_ingredients') THEN
    DELETE FROM unified_recipe_ingredients WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear recipes (child of recipe_templates)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipes') THEN
    DELETE FROM recipes WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear unified recipes if exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_recipes') THEN
    DELETE FROM unified_recipes WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear recipe template ingredients (child of recipe_templates)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_template_ingredients') THEN
    DELETE FROM recipe_template_ingredients WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear recipe templates (parent table)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_templates') THEN
    DELETE FROM recipe_templates WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear recipe deployment errors tracking (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_deployment_errors') THEN
    DELETE FROM recipe_deployment_errors WHERE id IS NOT NULL;
  END IF;
END $$;

-- Step 3: Clear all inventory-related data
-- =====================================================

-- Clear inventory movements (depends on inventory_stock)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
    DELETE FROM inventory_movements WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear purchase order items that reference inventory
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN
    UPDATE purchase_order_items SET inventory_stock_id = NULL WHERE inventory_stock_id IS NOT NULL;
  END IF;
END $$;

-- Clear recipe ingredients references to inventory
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_ingredients') THEN
    UPDATE recipe_ingredients SET inventory_stock_id = NULL WHERE inventory_stock_id IS NOT NULL;
  END IF;
END $$;

-- Clear all store inventory stock
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_stock') THEN
    DELETE FROM inventory_stock WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear inventory items (legacy table)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_items') THEN
    DELETE FROM inventory_items WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear commissary inventory
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'commissary_inventory') THEN
    DELETE FROM commissary_inventory WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear inventory conversions
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_conversions') THEN
    DELETE FROM inventory_conversions WHERE id IS NOT NULL;
  END IF;
END $$;

-- Step 4: Clear product-related data
-- =====================================================

-- Clear product ingredients
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_ingredients') THEN
    DELETE FROM product_ingredients WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear product addon items
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_addon_items') THEN
    DELETE FROM product_addon_items WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear products that have recipe references
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    DELETE FROM products WHERE recipe_id IS NOT NULL;
  END IF;
END $$;

-- Step 5: Clear supporting tables and tracking data
-- =====================================================

-- Clear standardized ingredients lookup (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'standardized_ingredients') THEN
    DELETE FROM standardized_ingredients WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear recipe ingredient categories (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_ingredient_categories') THEN
    DELETE FROM recipe_ingredient_categories WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear product catalog audit records (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_catalog_audit') THEN
    DELETE FROM product_catalog_audit WHERE id IS NOT NULL;
  END IF;
END $$;

-- Clear any recipe usage logs (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_usage_log') THEN
    DELETE FROM recipe_usage_log WHERE id IS NOT NULL;
  END IF;
END $$;

-- Step 6: Reset sequences and auto-increment counters
-- =====================================================

-- Reset recipe template sequence (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_templates') THEN
    PERFORM setval(pg_get_serial_sequence('recipe_templates', 'id'), 1, false);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if sequence doesn't exist
  NULL;
END $$;

-- Reset recipes sequence (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipes') THEN
    PERFORM setval(pg_get_serial_sequence('recipes', 'id'), 1, false);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if sequence doesn't exist
  NULL;
END $$;

-- Reset inventory stock sequence (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_stock') THEN
    PERFORM setval(pg_get_serial_sequence('inventory_stock', 'id'), 1, false);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if sequence doesn't exist
  NULL;
END $$;

-- Reset product catalog sequence (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_catalog') THEN
    PERFORM setval(pg_get_serial_sequence('product_catalog', 'id'), 1, false);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if sequence doesn't exist
  NULL;
END $$;

-- Step 7: Clean up any orphaned references
-- =====================================================

-- Update any remaining recipe_id references in products to NULL
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
    UPDATE products SET recipe_id = NULL WHERE recipe_id IS NOT NULL;
  END IF;
END $$;

-- Update any remaining inventory references in purchase orders to NULL
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'purchase_order_items') THEN
    UPDATE purchase_order_items SET inventory_stock_id = NULL WHERE inventory_stock_id IS NOT NULL;
  END IF;
END $$;

-- Step 8: Verification and logging
-- =====================================================

-- Log the reset operation (if system_logs table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_logs') THEN
    INSERT INTO system_logs (operation, details, created_at)
    VALUES (
      'COMPLETE_SYSTEM_RESET',
      'All recipe, inventory, and product catalog data cleared. System ready for fresh data upload.',
      NOW()
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Create a reset completion marker
CREATE TABLE IF NOT EXISTS system_reset_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reset_type TEXT NOT NULL,
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  created_by TEXT DEFAULT 'system'
);

INSERT INTO system_reset_log (reset_type, details) VALUES (
  'COMPLETE_RECIPE_INVENTORY_RESET',
  jsonb_build_object(
    'tables_cleared', ARRAY[
      'recipe_templates', 'recipes', 'recipe_ingredients', 'recipe_template_ingredients',
      'inventory_stock', 'inventory_items', 'commissary_inventory', 'inventory_movements',
      'product_catalog', 'product_ingredients', 'recipe_deployments',
      'recipe_ingredient_mappings', 'standardized_ingredients'
    ],
    'backup_tables_created', ARRAY[
      'stores_backup_reset', 'app_users_backup_reset', 'categories_backup_reset'
    ],
    'sequences_reset', ARRAY[
      'recipe_templates', 'recipes', 'inventory_stock', 'product_catalog'
    ]
  )
);

-- Final verification queries
DO $$
DECLARE
  recipe_count INTEGER := 0;
  inventory_count INTEGER := 0;
  product_count INTEGER := 0;
  store_count INTEGER := 0;
BEGIN
  -- Count recipe templates (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_templates') THEN
    SELECT COUNT(*) INTO recipe_count FROM recipe_templates;
  END IF;

  -- Count inventory stock (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_stock') THEN
    SELECT COUNT(*) INTO inventory_count FROM inventory_stock;
  END IF;

  -- Count product catalog (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_catalog') THEN
    SELECT COUNT(*) INTO product_count FROM product_catalog;
  END IF;

  -- Count active stores (if table exists)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stores') THEN
    SELECT COUNT(*) INTO store_count FROM stores WHERE is_active = true;
  END IF;

  RAISE NOTICE '=== SYSTEM RESET VERIFICATION ===';
  RAISE NOTICE 'Recipe templates remaining: %', recipe_count;
  RAISE NOTICE 'Inventory stock items remaining: %', inventory_count;
  RAISE NOTICE 'Product catalog items remaining: %', product_count;
  RAISE NOTICE 'Active stores preserved: %', store_count;
  RAISE NOTICE '=== RESET COMPLETE ===';

  IF recipe_count = 0 AND inventory_count = 0 AND product_count = 0 THEN
    RAISE NOTICE '✅ System reset successful - ready for fresh data upload';
  ELSE
    RAISE WARNING '⚠️  Some data may not have been cleared completely';
  END IF;
END $$;
