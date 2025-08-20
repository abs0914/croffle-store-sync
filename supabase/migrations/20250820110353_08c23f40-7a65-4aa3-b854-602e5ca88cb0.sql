-- Comprehensive Inventory Sync Fix - Phase 1 (Fixed)
-- Handle duplicates by direct deletion instead of renaming

-- Create cleanup log table
CREATE TABLE IF NOT EXISTS cleanup_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  old_id UUID,
  new_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to clean up duplicate products (safer approach)
CREATE OR REPLACE FUNCTION cleanup_duplicate_products_safe()
RETURNS TABLE(duplicates_removed INTEGER, products_updated INTEGER)
LANGUAGE plpgsql
SET search_path = 'public', 'auth'
AS $$
DECLARE
  removed_count INTEGER := 0;
  updated_count INTEGER := 0;
  duplicate_group RECORD;
  keeper_product RECORD;
  duplicate_product RECORD;
BEGIN
  -- Temporarily disable the trigger to avoid conflicts
  ALTER TABLE products DISABLE TRIGGER enhanced_product_uniqueness_trigger;
  
  -- Find groups of duplicate products (same name + store_id)
  FOR duplicate_group IN
    SELECT name, store_id, COUNT(*) as duplicate_count, ARRAY_AGG(id ORDER BY 
      CASE 
        WHEN recipe_id IS NOT NULL THEN 1 
        ELSE 2 
      END,
      created_at DESC
    ) as product_ids
    FROM products
    WHERE is_active = true
    GROUP BY name, store_id
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first product (preferring ones with recipe_id)
    SELECT * INTO keeper_product
    FROM products 
    WHERE id = duplicate_group.product_ids[1];
    
    -- Process duplicates (skip the keeper)
    FOR i IN 2..array_length(duplicate_group.product_ids, 1) LOOP
      SELECT * INTO duplicate_product
      FROM products
      WHERE id = duplicate_group.product_ids[i];
      
      -- Update any references to point to the keeper
      UPDATE transaction_items 
      SET product_id = keeper_product.id
      WHERE product_id = duplicate_product.id;
      
      UPDATE product_catalog
      SET product_name = keeper_product.name
      WHERE store_id = duplicate_product.store_id 
      AND product_name = duplicate_product.name;
      
      UPDATE product_variations
      SET product_id = keeper_product.id
      WHERE product_id = duplicate_product.id;
      
      -- Log the cleanup before deletion
      INSERT INTO cleanup_log (action, table_name, old_id, new_id, details)
      VALUES ('remove_duplicate', 'products', duplicate_product.id, keeper_product.id,
        jsonb_build_object('duplicate_name', duplicate_product.name, 'keeper_name', keeper_product.name));
      
      -- Delete the duplicate product
      DELETE FROM products WHERE id = duplicate_product.id;
      
      removed_count := removed_count + 1;
    END LOOP;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  -- Re-enable the trigger
  ALTER TABLE products ENABLE TRIGGER enhanced_product_uniqueness_trigger;
  
  RETURN QUERY SELECT removed_count, updated_count;
END;
$$;

-- Function to fix recipe template associations
CREATE OR REPLACE FUNCTION fix_recipe_template_associations()
RETURNS TABLE(products_fixed INTEGER, missing_templates INTEGER)
LANGUAGE plpgsql
SET search_path = 'public', 'auth'
AS $$
DECLARE
  fixed_count INTEGER := 0;
  missing_count INTEGER := 0;
  product_record RECORD;
  template_record RECORD;
BEGIN
  -- Loop through products without recipe templates
  FOR product_record IN 
    SELECT p.id, p.name, p.store_id, p.recipe_id
    FROM products p
    LEFT JOIN recipes r ON p.recipe_id = r.id
    LEFT JOIN recipe_templates rt ON r.template_id = rt.id
    WHERE p.is_active = true 
    AND (r.template_id IS NULL OR rt.id IS NULL)
  LOOP
    -- Try to find matching recipe template by name
    SELECT rt.id INTO template_record
    FROM recipe_templates rt
    WHERE LOWER(TRIM(rt.name)) = LOWER(TRIM(product_record.name))
    AND rt.is_active = true
    LIMIT 1;
    
    IF template_record IS NOT NULL THEN
      -- Update or create recipe with template association
      IF product_record.recipe_id IS NOT NULL THEN
        -- Update existing recipe to link to template
        UPDATE recipes 
        SET template_id = template_record
        WHERE id = product_record.recipe_id;
      ELSE
        -- Create new recipe with template link
        INSERT INTO recipes (
          name, store_id, template_id, is_active, serving_size, total_cost, cost_per_serving
        ) VALUES (
          product_record.name,
          product_record.store_id,
          template_record,
          true,
          1,
          0,
          0
        );
        
        -- Update product to reference new recipe
        UPDATE products 
        SET recipe_id = (SELECT id FROM recipes WHERE name = product_record.name AND store_id = product_record.store_id AND template_id = template_record LIMIT 1)
        WHERE id = product_record.id;
      END IF;
      
      fixed_count := fixed_count + 1;
      
      -- Log the fix
      INSERT INTO cleanup_log (action, table_name, old_id, details)
      VALUES ('fix_template_association', 'products', product_record.id, 
        jsonb_build_object('product_name', product_record.name, 'template_id', template_record));
    ELSE
      missing_count := missing_count + 1;
      
      -- Log missing template
      INSERT INTO cleanup_log (action, table_name, old_id, details)
      VALUES ('missing_template', 'products', product_record.id,
        jsonb_build_object('product_name', product_record.name, 'store_id', product_record.store_id));
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT fixed_count, missing_count;
END;
$$;

-- Execute the cleanup functions
SELECT * FROM cleanup_duplicate_products_safe();
SELECT * FROM fix_recipe_template_associations();

-- Create enhanced product uniqueness constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_active_name_store
ON products (name, store_id) 
WHERE is_active = true;

-- Create enhanced product uniqueness trigger
CREATE OR REPLACE FUNCTION enhanced_product_uniqueness_check()
RETURNS TRIGGER 
SET search_path = 'public', 'auth'
AS $$
BEGIN
  -- Only check active products
  IF NEW.is_active = true THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.name != NEW.name OR OLD.store_id != NEW.store_id OR OLD.is_active != NEW.is_active)) THEN
      IF EXISTS (
        SELECT 1 FROM products 
        WHERE name = NEW.name 
        AND store_id = NEW.store_id 
        AND id != NEW.id
        AND is_active = true
      ) THEN
        RAISE EXCEPTION 'Active product "%" already exists in this store', NEW.name;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER enhanced_product_uniqueness_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION enhanced_product_uniqueness_check();

-- Create validation function for product template associations
CREATE OR REPLACE FUNCTION validate_product_has_recipe_template(product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = 'public', 'auth'
AS $$
DECLARE
  has_template BOOLEAN := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM products p
    JOIN recipes r ON p.recipe_id = r.id
    JOIN recipe_templates rt ON r.template_id = rt.id
    WHERE p.id = product_id
    AND p.is_active = true
    AND rt.is_active = true
  ) INTO has_template;
  
  RETURN has_template;
END;
$$;