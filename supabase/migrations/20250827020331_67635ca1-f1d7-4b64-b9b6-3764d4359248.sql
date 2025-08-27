-- Create a catalog-only deployment function that works with existing recipes
CREATE OR REPLACE FUNCTION public.deploy_catalog_products_only()
 RETURNS TABLE(products_added integer, stores_processed integer, execution_time_ms integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  start_time TIMESTAMP := clock_timestamp();
  store_record RECORD;
  template_record RECORD;
  existing_recipe_id UUID;
  existing_category_id UUID;
  products_count INTEGER := 0;
  stores_count INTEGER := 0;
BEGIN
  -- Process each active store
  FOR store_record IN 
    SELECT id, name FROM stores WHERE is_active = true
  LOOP
    stores_count := stores_count + 1;
    
    -- Process each active recipe template
    FOR template_record IN 
      SELECT * FROM recipe_templates WHERE is_active = true
    LOOP
      -- Check if product catalog entry already exists
      IF NOT EXISTS (
        SELECT 1 FROM product_catalog pc
        WHERE pc.store_id = store_record.id 
          AND pc.product_name = template_record.name
      ) THEN
        -- Find existing recipe for this template and store
        SELECT r.id INTO existing_recipe_id
        FROM recipes r
        WHERE r.template_id = template_record.id 
          AND r.store_id = store_record.id 
          AND r.is_active = true
        LIMIT 1;
        
        -- If no recipe exists, try to find by name
        IF existing_recipe_id IS NULL THEN
          SELECT r.id INTO existing_recipe_id
          FROM recipes r
          WHERE r.name = template_record.name
            AND r.store_id = store_record.id 
            AND r.is_active = true
          LIMIT 1;
        END IF;
        
        -- Find category for this template
        SELECT c.id INTO existing_category_id
        FROM categories c
        WHERE c.store_id = store_record.id 
          AND c.name = template_record.category_name
        LIMIT 1;
        
        -- Create category if it doesn't exist
        IF existing_category_id IS NULL THEN
          INSERT INTO categories (name, store_id, is_active, created_at, updated_at)
          VALUES (template_record.category_name, store_record.id, true, NOW(), NOW())
          RETURNING id INTO existing_category_id;
        END IF;
        
        -- Create product catalog entry
        INSERT INTO product_catalog (
          store_id, product_name, description, price, recipe_id, 
          category_id, is_available, created_at, updated_at
        ) VALUES (
          store_record.id,
          template_record.name,
          template_record.description,
          COALESCE(template_record.suggested_price, 100.00),
          existing_recipe_id, -- Can be NULL
          existing_category_id,
          true,
          NOW(), NOW()
        );
        
        products_count := products_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT 
    products_count,
    stores_count,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
END;
$function$;