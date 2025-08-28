-- =====================================================
-- DEPRECATED SCRIPT - DO NOT USE
-- =====================================================
-- 
-- This script has been deprecated and replaced by the unified system.
-- 
-- Reason: Replaced by unified setup scripts
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

-- Apply Database Updates for Unified Recipe Management System
-- Run this script directly in the Supabase SQL editor

-- Step 1: Add missing columns to recipe_templates
-- DO $$ 
-- BEGIN
  -- Add total_cost column if it doesn't exist
--   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_templates' AND column_name = 'total_cost') THEN
--     ALTER TABLE recipe_templates ADD COLUMN total_cost NUMERIC DEFAULT 0;
--     RAISE NOTICE 'Added total_cost column to recipe_templates';
--   ELSE
--     RAISE NOTICE 'total_cost column already exists in recipe_templates';
--   END IF;
  
  -- Add suggested_price column if it doesn't exist
--   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_templates' AND column_name = 'suggested_price') THEN
--     ALTER TABLE recipe_templates ADD COLUMN suggested_price NUMERIC DEFAULT 0;
--     RAISE NOTICE 'Added suggested_price column to recipe_templates';
--   ELSE
--     RAISE NOTICE 'suggested_price column already exists in recipe_templates';
--   END IF;
-- END $$;

-- Step 2: Ensure product_catalog has category_id column
-- DO $$ 
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_catalog' AND column_name = 'category_id') THEN
--     ALTER TABLE product_catalog ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
--     RAISE NOTICE 'Added category_id column to product_catalog';
--   ELSE
--     RAISE NOTICE 'category_id column already exists in product_catalog';
--   END IF;
-- END $$;

-- Step 3: Create indexes for better performance
-- CREATE INDEX IF NOT EXISTS idx_product_catalog_category_id ON product_catalog(category_id);
-- CREATE INDEX IF NOT EXISTS idx_product_catalog_store_category ON product_catalog(store_id, category_id);
-- CREATE INDEX IF NOT EXISTS idx_categories_store_name ON categories(store_id, name);

-- Step 4: Create standard categories for all stores
-- INSERT INTO categories (name, description, store_id, is_active)
-- SELECT 
--   category_name,
--   'Category for ' || category_name || ' items',
--   s.id,
--   true
-- FROM stores s
-- CROSS JOIN (
--   VALUES 
--     ('Premium'),
--     ('Fruity'),
--     ('Classic'),
--     ('Combo'),
--     ('Mini Croffle'),
--     ('Croffle Overload'),
--     ('Add-ons'),
--     ('Espresso'),
--     ('Beverages'),
--     ('Blended'),
--     ('Cold Beverages'),
--     ('Glaze'),
--     ('Mix & Match')
-- ) AS standard_categories(category_name)
-- WHERE s.is_active = true
-- ON CONFLICT (store_id, name) DO UPDATE SET
--   is_active = true,
--   description = EXCLUDED.description,
--   updated_at = NOW();

-- Step 5: Create category mapping function
-- CREATE OR REPLACE FUNCTION map_template_category_to_pos(template_category TEXT)
-- RETURNS TEXT AS $$
-- BEGIN
--   RETURN CASE LOWER(TRIM(template_category))
--     WHEN 'premium' THEN 'Premium'
--     WHEN 'fruity' THEN 'Fruity'
--     WHEN 'classic' THEN 'Classic'
--     WHEN 'combo' THEN 'Combo'
--     WHEN 'mini_croffle' THEN 'Mini Croffle'
--     WHEN 'croffle_overload' THEN 'Croffle Overload'
--     WHEN 'add-on' THEN 'Add-ons'
--     WHEN 'addon' THEN 'Add-ons'
--     WHEN 'espresso' THEN 'Espresso'
--     WHEN 'beverages' THEN 'Beverages'
--     WHEN 'blended' THEN 'Blended'
--     WHEN 'cold' THEN 'Cold Beverages'
--     WHEN 'glaze' THEN 'Glaze'
--     WHEN 'mix & match' THEN 'Mix & Match'
    -- Legacy mappings
--     WHEN 'croffles' THEN 'Classic'
--     WHEN 'drinks' THEN 'Beverages'
--     WHEN 'add-ons' THEN 'Add-ons'
--     WHEN 'combos' THEN 'Combo'
    -- Default fallback
--     ELSE 'Classic'
--   END;
-- END;
-- $$ LANGUAGE plpgsql IMMUTABLE;

-- Step 6: Create get or create category function
-- CREATE OR REPLACE FUNCTION get_or_create_category(store_id_param UUID, template_category TEXT)
-- RETURNS UUID AS $$
-- DECLARE
--   pos_category TEXT;
--   category_id UUID;
-- BEGIN
  -- Map template category to POS category
--   pos_category := map_template_category_to_pos(template_category);
  
  -- Try to find existing category
--   SELECT id INTO category_id
--   FROM categories
--   WHERE store_id = store_id_param
--     AND name = pos_category
--     AND is_active = true
--   LIMIT 1;
  
  -- If not found, create it
--   IF category_id IS NULL THEN
--     INSERT INTO categories (store_id, name, description, is_active)
--     VALUES (store_id_param, pos_category, 'Category for ' || pos_category || ' items', true)
--     RETURNING id INTO category_id;
--   END IF;
  
--   RETURN category_id;
-- END;
-- $$ LANGUAGE plpgsql;

-- Step 7: Create trigger function for automatic category assignment
-- CREATE OR REPLACE FUNCTION assign_product_category()
-- RETURNS TRIGGER AS $$
-- DECLARE
--   template_category TEXT;
--   assigned_category_id UUID;
-- BEGIN
  -- Only process if category_id is null and recipe_id is provided
--   IF NEW.category_id IS NULL AND NEW.recipe_id IS NOT NULL THEN
    -- Get template category from recipe
--     SELECT rt.category_name INTO template_category
--     FROM recipes r
--     JOIN recipe_templates rt ON r.template_id = rt.id
--     WHERE r.id = NEW.recipe_id;
    
    -- If we found a template category, assign the appropriate POS category
--     IF template_category IS NOT NULL THEN
--       assigned_category_id := get_or_create_category(NEW.store_id, template_category);
--       NEW.category_id := assigned_category_id;
--     END IF;
--   END IF;
  
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Step 8: Create the trigger
-- DROP TRIGGER IF EXISTS trigger_assign_product_category ON product_catalog;
-- CREATE TRIGGER trigger_assign_product_category
--   BEFORE INSERT OR UPDATE ON product_catalog
--   FOR EACH ROW
--   EXECUTE FUNCTION assign_product_category();

-- Step 9: Update existing product_catalog entries that don't have categories
-- UPDATE product_catalog
-- SET category_id = get_or_create_category(product_catalog.store_id, rt.category_name)
-- FROM recipes r
-- JOIN recipe_templates rt ON r.template_id = rt.id
-- WHERE product_catalog.recipe_id = r.id
--   AND product_catalog.category_id IS NULL
--   AND rt.category_name IS NOT NULL;

-- Step 10: Create recipe management summary view
-- CREATE OR REPLACE VIEW recipe_management_summary AS
-- SELECT 
--   s.name as store_name,
--   COUNT(DISTINCT rt.id) as total_templates,
--   COUNT(DISTINCT r.id) as deployed_recipes,
--   COUNT(DISTINCT pc.id) as catalog_products,
--   COUNT(DISTINCT CASE WHEN pc.category_id IS NOT NULL THEN pc.id END) as categorized_products,
--   COUNT(DISTINCT c.id) as total_categories
-- FROM stores s
-- LEFT JOIN recipes r ON s.id = r.store_id AND r.is_active = true
-- LEFT JOIN recipe_templates rt ON r.template_id = rt.id AND rt.is_active = true
-- LEFT JOIN product_catalog pc ON s.id = pc.store_id AND pc.is_available = true
-- LEFT JOIN categories c ON s.id = c.store_id AND c.is_active = true
-- WHERE s.is_active = true
-- GROUP BY s.id, s.name
-- ORDER BY s.name;

-- Step 11: Create safe clear function
-- CREATE OR REPLACE FUNCTION safe_clear_recipe_data()
-- RETURNS TABLE(
--   templates_deactivated INTEGER,
--   recipes_deactivated INTEGER,
--   catalog_references_cleared INTEGER
-- ) AS $$
-- DECLARE
--   template_count INTEGER;
--   recipe_count INTEGER;
--   catalog_count INTEGER;
-- BEGIN
  -- Deactivate recipe templates
--   UPDATE recipe_templates 
--   SET is_active = false, updated_at = NOW()
--   WHERE is_active = true;
  
--   GET DIAGNOSTICS template_count = ROW_COUNT;
  
  -- Deactivate recipes
--   UPDATE recipes 
--   SET is_active = false, updated_at = NOW()
--   WHERE is_active = true;
  
--   GET DIAGNOSTICS recipe_count = ROW_COUNT;
  
  -- Clear product catalog recipe references
--   UPDATE product_catalog 
--   SET recipe_id = NULL, updated_at = NOW()
--   WHERE recipe_id IS NOT NULL;
  
--   GET DIAGNOSTICS catalog_count = ROW_COUNT;
  
--   RETURN QUERY SELECT template_count, recipe_count, catalog_count;
-- END;
-- $$ LANGUAGE plpgsql;

-- Step 12: Grant permissions
-- GRANT EXECUTE ON FUNCTION map_template_category_to_pos(TEXT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_or_create_category(UUID, TEXT) TO authenticated;
-- GRANT EXECUTE ON FUNCTION safe_clear_recipe_data() TO authenticated;
-- GRANT SELECT ON recipe_management_summary TO authenticated;

-- Step 13: Add comments
-- COMMENT ON FUNCTION map_template_category_to_pos(TEXT) IS 'Maps recipe template categories to POS display categories';
-- COMMENT ON FUNCTION get_or_create_category(UUID, TEXT) IS 'Gets existing category or creates new one for a store based on template category';
-- COMMENT ON FUNCTION assign_product_category() IS 'Trigger function to automatically assign categories to product catalog entries';
-- COMMENT ON VIEW recipe_management_summary IS 'Summary view of recipe management system status across all stores';
-- COMMENT ON FUNCTION safe_clear_recipe_data() IS 'Safely clears all recipe data by deactivating instead of deleting';

-- Final verification query
-- SELECT 'Database updates completed successfully!' as status;
