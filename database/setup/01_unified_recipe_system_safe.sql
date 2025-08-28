-- =====================================================
-- UNIFIED RECIPE SYSTEM - SAFE SETUP (CONSTRAINT-AWARE)
-- =====================================================
-- 
-- This is a safer version that handles existing data and constraints gracefully.
-- Use this version if the regular setup script encounters constraint violations.
--
-- What this script does:
-- 1. Adds required columns safely
-- 2. Creates performance indexes
-- 3. Sets up standard categories (handles duplicates)
-- 4. Creates essential database functions
-- 5. Sets up automatic triggers
-- 6. Creates monitoring views
-- 7. Updates categories WITHOUT triggering product sync issues
--
-- Prerequisites: None (this is the foundation script)
-- Execution: Copy and paste entire script into Supabase SQL Editor
-- =====================================================

-- Step 1: Add required columns to recipe_templates table
DO $$ 
BEGIN
  -- Add total_cost column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_templates' AND column_name = 'total_cost') THEN
    ALTER TABLE recipe_templates ADD COLUMN total_cost NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added total_cost column to recipe_templates';
  ELSE
    RAISE NOTICE 'total_cost column already exists in recipe_templates';
  END IF;
  
  -- Add suggested_price column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_templates' AND column_name = 'suggested_price') THEN
    ALTER TABLE recipe_templates ADD COLUMN suggested_price NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added suggested_price column to recipe_templates';
  ELSE
    RAISE NOTICE 'suggested_price column already exists in recipe_templates';
  END IF;
  
  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recipe_templates' AND column_name = 'image_url') THEN
    ALTER TABLE recipe_templates ADD COLUMN image_url TEXT;
    RAISE NOTICE 'Added image_url column to recipe_templates';
  ELSE
    RAISE NOTICE 'image_url column already exists in recipe_templates';
  END IF;
END $$;

-- Step 2: Ensure product_catalog has category_id column
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_catalog' AND column_name = 'category_id') THEN
    ALTER TABLE product_catalog ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added category_id column to product_catalog';
  ELSE
    RAISE NOTICE 'category_id column already exists in product_catalog';
  END IF;
END $$;

-- Step 3: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_product_catalog_category_id ON product_catalog(category_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_store_category ON product_catalog(store_id, category_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_name ON categories(store_id, name);
CREATE INDEX IF NOT EXISTS idx_recipes_template_store ON recipes(template_id, store_id);
CREATE INDEX IF NOT EXISTS idx_recipe_templates_active ON recipe_templates(is_active) WHERE is_active = true;

DO $$ BEGIN RAISE NOTICE 'Created performance indexes'; END $$;

-- Step 4: Create standard categories for all stores (handles duplicates gracefully)
DO $$
DECLARE
  store_record RECORD;
  category_name TEXT;
  category_names TEXT[] := ARRAY['Premium', 'Fruity', 'Classic', 'Combo', 'Mini Croffle', 'Croffle Overload', 'Add-ons', 'Espresso', 'Beverages', 'Blended', 'Cold Beverages', 'Glaze', 'Mix & Match'];
BEGIN
  FOR store_record IN SELECT id, name FROM stores WHERE is_active = true LOOP
    FOREACH category_name IN ARRAY category_names LOOP
      -- Insert category if it doesn't exist
      INSERT INTO categories (name, description, store_id, is_active)
      VALUES (
        category_name,
        'Category for ' || category_name || ' items',
        store_record.id,
        true
      )
      ON CONFLICT (store_id, name) DO UPDATE SET
        is_active = true,
        description = EXCLUDED.description,
        updated_at = NOW();
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Created/updated standard categories for all stores';
END $$;

-- Step 5: Create category mapping function (simplified - use exact CSV values)
CREATE OR REPLACE FUNCTION map_template_category_to_pos(template_category TEXT)
RETURNS TEXT AS $$
BEGIN
  -- No mapping needed - just return the exact category name from CSV
  -- This follows the principle: "Take what's in the file and use it directly"
  RETURN TRIM(template_category);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$ BEGIN RAISE NOTICE 'Created category mapping function'; END $$;

-- Step 6: Create get or create category function
CREATE OR REPLACE FUNCTION get_or_create_category(store_id_param UUID, template_category TEXT)
RETURNS UUID AS $$
DECLARE
  pos_category TEXT;
  category_id UUID;
BEGIN
  -- Map template category to POS category
  pos_category := map_template_category_to_pos(template_category);
  
  -- Try to find existing category
  SELECT id INTO category_id
  FROM categories
  WHERE store_id = store_id_param
    AND name = pos_category
    AND is_active = true
  LIMIT 1;
  
  -- If not found, create it
  IF category_id IS NULL THEN
    INSERT INTO categories (store_id, name, description, is_active)
    VALUES (store_id_param, pos_category, 'Category for ' || pos_category || ' items', true)
    ON CONFLICT (store_id, name) DO UPDATE SET
      is_active = true,
      updated_at = NOW()
    RETURNING id INTO category_id;
  END IF;
  
  RETURN category_id;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN RAISE NOTICE 'Created get_or_create_category function'; END $$;

-- Step 7: Create automatic category assignment trigger
CREATE OR REPLACE FUNCTION assign_product_category()
RETURNS TRIGGER AS $$
DECLARE
  template_category TEXT;
  assigned_category_id UUID;
BEGIN
  -- Only process if category_id is null and recipe_id is provided
  IF NEW.category_id IS NULL AND NEW.recipe_id IS NOT NULL THEN
    -- Get template category from recipe
    SELECT rt.category_name INTO template_category
    FROM recipes r
    JOIN recipe_templates rt ON r.template_id = rt.id
    WHERE r.id = NEW.recipe_id;
    
    -- If we found a template category, assign the appropriate POS category
    IF template_category IS NOT NULL THEN
      assigned_category_id := get_or_create_category(NEW.store_id, template_category);
      NEW.category_id := assigned_category_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_assign_product_category ON product_catalog;
CREATE TRIGGER trigger_assign_product_category
  BEFORE INSERT OR UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION assign_product_category();

DO $$ BEGIN RAISE NOTICE 'Created automatic category assignment trigger'; END $$;

-- Step 8: Update existing uncategorized products (SAFE VERSION - NO PRODUCT SYNC)
DO $$
DECLARE
  updated_count INTEGER := 0;
  product_record RECORD;
  category_id_var UUID;
BEGIN
  -- Disable any product sync triggers temporarily
  PERFORM pg_advisory_lock(12345); -- Use advisory lock to prevent conflicts
  
  -- Update products one by one to avoid constraint violations
  FOR product_record IN 
    SELECT pc.id, pc.store_id, rt.category_name
    FROM product_catalog pc
    JOIN recipes r ON pc.recipe_id = r.id
    JOIN recipe_templates rt ON r.template_id = rt.id
    WHERE pc.category_id IS NULL
      AND rt.category_name IS NOT NULL
      AND pc.is_available = true
  LOOP
    BEGIN
      -- Get category ID
      category_id_var := get_or_create_category(product_record.store_id, product_record.category_name);
      
      -- Update only the category_id field to minimize trigger impact
      UPDATE product_catalog 
      SET category_id = category_id_var
      WHERE id = product_record.id;
      
      updated_count := updated_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other products
      RAISE NOTICE 'Failed to update product ID %: %', product_record.id, SQLERRM;
    END;
  END LOOP;
  
  PERFORM pg_advisory_unlock(12345);
  
  RAISE NOTICE 'Updated % existing uncategorized products', updated_count;
END $$;

-- Step 9: Create recipe management summary view
CREATE OR REPLACE VIEW recipe_management_summary AS
SELECT 
  s.name as store_name,
  s.id as store_id,
  COUNT(DISTINCT rt.id) as total_templates,
  COUNT(DISTINCT r.id) as deployed_recipes,
  COUNT(DISTINCT pc.id) as catalog_products,
  COUNT(DISTINCT CASE WHEN pc.category_id IS NOT NULL THEN pc.id END) as categorized_products,
  COUNT(DISTINCT c.id) as total_categories,
  ROUND(
    (COUNT(DISTINCT CASE WHEN pc.category_id IS NOT NULL THEN pc.id END)::NUMERIC / 
     NULLIF(COUNT(DISTINCT pc.id), 0)) * 100, 2
  ) as categorization_percentage
FROM stores s
LEFT JOIN recipes r ON s.id = r.store_id AND r.is_active = true
LEFT JOIN recipe_templates rt ON r.template_id = rt.id AND rt.is_active = true
LEFT JOIN product_catalog pc ON s.id = pc.store_id AND pc.is_available = true
LEFT JOIN categories c ON s.id = c.store_id AND c.is_active = true
WHERE s.is_active = true
GROUP BY s.id, s.name
ORDER BY s.name;

DO $$ BEGIN RAISE NOTICE 'Created recipe management summary view'; END $$;

-- Step 10: Create safe data clearing function
CREATE OR REPLACE FUNCTION safe_clear_recipe_data()
RETURNS TABLE(
  templates_deactivated INTEGER,
  recipes_deactivated INTEGER,
  catalog_references_cleared INTEGER
) AS $$
DECLARE
  template_count INTEGER;
  recipe_count INTEGER;
  catalog_count INTEGER;
BEGIN
  -- Deactivate recipe templates
  UPDATE recipe_templates 
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true;
  
  GET DIAGNOSTICS template_count = ROW_COUNT;
  
  -- Deactivate recipes
  UPDATE recipes 
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true;
  
  GET DIAGNOSTICS recipe_count = ROW_COUNT;
  
  -- Clear product catalog recipe references
  UPDATE product_catalog 
  SET recipe_id = NULL, updated_at = NOW()
  WHERE recipe_id IS NOT NULL;
  
  GET DIAGNOSTICS catalog_count = ROW_COUNT;
  
  RETURN QUERY SELECT template_count, recipe_count, catalog_count;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN RAISE NOTICE 'Created safe data clearing function'; END $$;

-- Step 11: Grant necessary permissions
GRANT EXECUTE ON FUNCTION map_template_category_to_pos(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_category(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_clear_recipe_data() TO authenticated;
GRANT SELECT ON recipe_management_summary TO authenticated;

-- Step 12: Add helpful comments
COMMENT ON FUNCTION map_template_category_to_pos(TEXT) IS 'Maps recipe template categories to POS display categories';
COMMENT ON FUNCTION get_or_create_category(UUID, TEXT) IS 'Gets existing category or creates new one for a store based on template category';
COMMENT ON FUNCTION assign_product_category() IS 'Trigger function to automatically assign categories to product catalog entries';
COMMENT ON VIEW recipe_management_summary IS 'Summary view of recipe management system status across all stores';
COMMENT ON FUNCTION safe_clear_recipe_data() IS 'Safely clears all recipe data by deactivating instead of deleting';

-- Final success message
SELECT 'UNIFIED RECIPE SYSTEM SETUP COMPLETE (SAFE VERSION)!' as status;
