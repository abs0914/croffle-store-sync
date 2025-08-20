-- Comprehensive Inventory Sync Fix - Phase 1 (Simple Safe Approach)

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

-- First, create the enhanced uniqueness trigger
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

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS check_product_uniqueness_trigger ON products;
DROP TRIGGER IF EXISTS enhanced_product_uniqueness_trigger ON products;

-- Simple cleanup function that uses safe deletion approach
CREATE OR REPLACE FUNCTION simple_duplicate_cleanup()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public', 'auth'
AS $$
DECLARE
  removed_count INTEGER := 0;
  duplicate_record RECORD;
  keeper_id UUID;
BEGIN
  -- Find and handle duplicates one by one
  FOR duplicate_record IN
    SELECT name, store_id, 
           array_agg(id ORDER BY 
             CASE WHEN recipe_id IS NOT NULL THEN 1 ELSE 2 END,
             created_at DESC
           ) as ids
    FROM products
    WHERE is_active = true
    GROUP BY name, store_id
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first ID (best candidate)
    keeper_id := duplicate_record.ids[1];
    
    -- Handle other IDs as duplicates
    FOR i IN 2..array_length(duplicate_record.ids, 1) LOOP
      -- Update references to point to keeper
      UPDATE transaction_items 
      SET product_id = keeper_id
      WHERE product_id = duplicate_record.ids[i];
      
      UPDATE product_variations
      SET product_id = keeper_id
      WHERE product_id = duplicate_record.ids[i];
      
      -- Log before deletion
      INSERT INTO cleanup_log (action, table_name, old_id, new_id, details)
      VALUES ('remove_duplicate', 'products', duplicate_record.ids[i], keeper_id,
        jsonb_build_object('product_name', duplicate_record.name, 'store_id', duplicate_record.store_id));
      
      -- Delete the duplicate
      DELETE FROM products WHERE id = duplicate_record.ids[i];
      removed_count := removed_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN 'Removed ' || removed_count || ' duplicate products';
END;
$$;

-- Execute duplicate cleanup
SELECT simple_duplicate_cleanup();

-- Now create the trigger (after cleanup is done)
CREATE TRIGGER enhanced_product_uniqueness_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION enhanced_product_uniqueness_check();

-- Simple recipe template fix function
CREATE OR REPLACE FUNCTION simple_template_fix()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = 'public', 'auth'
AS $$
DECLARE
  fixed_count INTEGER := 0;
  missing_count INTEGER := 0;
  product_record RECORD;
  template_id_found UUID;
  new_recipe_id UUID;
BEGIN
  -- Handle products without proper recipe templates
  FOR product_record IN 
    SELECT p.id, p.name, p.store_id, p.recipe_id
    FROM products p
    LEFT JOIN recipes r ON p.recipe_id = r.id
    LEFT JOIN recipe_templates rt ON r.template_id = rt.id
    WHERE p.is_active = true 
    AND (r.template_id IS NULL OR rt.id IS NULL)
  LOOP
    -- Find matching template
    SELECT rt.id INTO template_id_found
    FROM recipe_templates rt
    WHERE LOWER(TRIM(rt.name)) = LOWER(TRIM(product_record.name))
    AND rt.is_active = true
    LIMIT 1;
    
    IF template_id_found IS NOT NULL THEN
      IF product_record.recipe_id IS NOT NULL THEN
        -- Update existing recipe
        UPDATE recipes 
        SET template_id = template_id_found
        WHERE id = product_record.recipe_id;
      ELSE
        -- Create new recipe
        INSERT INTO recipes (name, store_id, template_id, is_active, serving_size, total_cost, cost_per_serving)
        VALUES (product_record.name, product_record.store_id, template_id_found, true, 1, 0, 0)
        RETURNING id INTO new_recipe_id;
        
        -- Link product to new recipe
        UPDATE products 
        SET recipe_id = new_recipe_id
        WHERE id = product_record.id;
      END IF;
      
      fixed_count := fixed_count + 1;
      
      INSERT INTO cleanup_log (action, table_name, old_id, details)
      VALUES ('fix_template_association', 'products', product_record.id, 
        jsonb_build_object('product_name', product_record.name, 'template_id', template_id_found));
    ELSE
      missing_count := missing_count + 1;
      
      INSERT INTO cleanup_log (action, table_name, old_id, details)
      VALUES ('missing_template', 'products', product_record.id,
        jsonb_build_object('product_name', product_record.name, 'store_id', product_record.store_id));
    END IF;
  END LOOP;
  
  RETURN 'Fixed ' || fixed_count || ' products, ' || missing_count || ' still missing templates';
END;
$$;

-- Execute template fix
SELECT simple_template_fix();

-- Create uniqueness constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_active_name_store
ON products (name, store_id) 
WHERE is_active = true;

-- Create validation function
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