-- Fix the ambiguous column reference in the deployment function
CREATE OR REPLACE FUNCTION public.deploy_missing_products_to_catalog()
 RETURNS TABLE(products_added integer, categories_added integer, stores_processed integer, execution_time_ms integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  start_time TIMESTAMP := clock_timestamp();
  store_record RECORD;
  template_record RECORD;
  current_recipe_id UUID;
  current_category_id UUID;
  products_count INTEGER := 0;
  categories_count INTEGER := 0;
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
      -- Find or create the recipe for this template and store
      SELECT r.id INTO current_recipe_id
      FROM recipes r
      WHERE r.template_id = template_record.id 
        AND r.store_id = store_record.id 
        AND r.is_active = true
      LIMIT 1;
      
      -- If no recipe exists, create it
      IF current_recipe_id IS NULL THEN
        INSERT INTO recipes (
          name, store_id, template_id, is_active, serving_size,
          instructions, total_cost, cost_per_serving, created_at, updated_at
        ) VALUES (
          template_record.name,
          store_record.id,
          template_record.id,
          true,
          COALESCE(template_record.serving_size, 1),
          COALESCE(template_record.instructions, 'Follow standard preparation instructions'),
          0, 0, NOW(), NOW()
        ) RETURNING id INTO current_recipe_id;
        
        -- Add recipe ingredients
        INSERT INTO recipe_ingredients (
          recipe_id, ingredient_name, quantity, unit, cost_per_unit, created_at, updated_at
        )
        SELECT 
          current_recipe_id,
          rti.ingredient_name,
          rti.quantity,
          CASE 
            WHEN LOWER(rti.unit) IN ('piece', 'pieces', 'pair', 'serving', 'portion', 'scoop') THEN 'pieces'::inventory_unit
            WHEN LOWER(rti.unit) IN ('pack', 'packs') THEN 'packs'::inventory_unit
            WHEN LOWER(rti.unit) IN ('box', 'boxes') THEN 'boxes'::inventory_unit
            WHEN LOWER(rti.unit) IN ('liter', 'liters') THEN 'liters'::inventory_unit
            WHEN LOWER(rti.unit) = 'ml' THEN 'ml'::inventory_unit
            WHEN LOWER(rti.unit) IN ('gram', 'grams', 'g') THEN 'g'::inventory_unit
            WHEN LOWER(rti.unit) = 'kg' THEN 'kg'::inventory_unit
            ELSE 'pieces'::inventory_unit
          END,
          rti.cost_per_unit,
          NOW(), NOW()
        FROM recipe_template_ingredients rti
        WHERE rti.recipe_template_id = template_record.id;
        
        -- Update recipe costs
        UPDATE recipes SET
          total_cost = (
            SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
            FROM recipe_ingredients ri WHERE ri.recipe_id = current_recipe_id
          )
        WHERE id = current_recipe_id;
      END IF;
      
      -- Find or create category
      SELECT c.id INTO current_category_id
      FROM categories c
      WHERE c.store_id = store_record.id 
        AND c.name = template_record.category_name
      LIMIT 1;
      
      IF current_category_id IS NULL THEN
        INSERT INTO categories (name, store_id, is_active, created_at, updated_at)
        VALUES (template_record.category_name, store_record.id, true, NOW(), NOW())
        RETURNING id INTO current_category_id;
        categories_count := categories_count + 1;
      END IF;
      
      -- Insert product catalog entry if it doesn't exist
      INSERT INTO product_catalog (
        store_id, product_name, description, price, recipe_id, 
        category_id, is_available, created_at, updated_at
      )
      SELECT 
        store_record.id,
        template_record.name,
        template_record.description,
        COALESCE(template_record.suggested_price, 100.00),
        current_recipe_id,
        current_category_id,
        true,
        NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM product_catalog pc
        WHERE pc.store_id = store_record.id 
          AND pc.product_name = template_record.name
      );
      
      -- Count if we added a product
      IF FOUND THEN
        products_count := products_count + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT 
    products_count,
    categories_count,
    stores_count,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
END;
$function$;