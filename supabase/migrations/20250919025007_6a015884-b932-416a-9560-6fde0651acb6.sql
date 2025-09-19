-- Create updated deployment function with correct schema mapping
CREATE OR REPLACE FUNCTION deploy_recipe_templates_to_all_stores_v2()
RETURNS TABLE(
  deployed_recipes integer, 
  fixed_recipes integer, 
  deployed_ingredients integer, 
  deployed_products integer, 
  skipped_existing integer, 
  total_stores integer, 
  total_templates integer, 
  execution_time_ms integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  start_time TIMESTAMP := clock_timestamp();
  store_record RECORD;
  template_record RECORD;
  new_recipe_id UUID;
  existing_recipe_id UUID;
  deployed_count INTEGER := 0;
  fixed_count INTEGER := 0;
  ingredient_count INTEGER := 0;
  product_count INTEGER := 0;
  skipped_count INTEGER := 0;
  store_count INTEGER := 0;
  template_count INTEGER := 0;
  ingredients_added INTEGER := 0;
  existing_ingredient_count INTEGER := 0;
  template_ingredient_count INTEGER := 0;
BEGIN
  -- Count active stores and templates
  SELECT COUNT(*) INTO store_count FROM stores WHERE is_active = true;
  SELECT COUNT(*) INTO template_count FROM recipe_templates WHERE is_active = true;
  
  -- Deploy to all active stores
  FOR store_record IN 
    SELECT id, name FROM stores WHERE is_active = true
  LOOP
    -- Deploy all active recipe templates to this store
    FOR template_record IN 
      SELECT * FROM recipe_templates WHERE is_active = true
    LOOP
      -- Check if recipe already exists for this template and store
      SELECT r.id INTO existing_recipe_id
      FROM recipes r
      WHERE r.template_id = template_record.id 
        AND r.store_id = store_record.id 
        AND r.is_active = true
      LIMIT 1;
      
      IF existing_recipe_id IS NOT NULL THEN
        -- Recipe exists - check if ingredients are complete
        SELECT COUNT(*) INTO existing_ingredient_count
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = existing_recipe_id;
        
        SELECT COUNT(*) INTO template_ingredient_count
        FROM recipe_template_ingredients rti
        WHERE rti.recipe_template_id = template_record.id;
        
        IF existing_ingredient_count < template_ingredient_count THEN
          -- Fix incomplete recipe by adding missing ingredients
          INSERT INTO recipe_ingredients (
            recipe_id,
            inventory_stock_id,
            quantity,
            unit,
            cost_per_unit,
            created_at,
            updated_at
          )
          SELECT 
            existing_recipe_id,
            ist.id, -- Use inventory_stock_id
            rti.quantity,
            CASE 
              WHEN LOWER(rti.unit) = 'piece' THEN 'pieces'::inventory_unit
              WHEN LOWER(rti.unit) = 'pieces' THEN 'pieces'::inventory_unit
              WHEN LOWER(rti.unit) = 'pack' THEN 'packs'::inventory_unit
              WHEN LOWER(rti.unit) = 'packs' THEN 'packs'::inventory_unit
              WHEN LOWER(rti.unit) = 'box' THEN 'boxes'::inventory_unit
              WHEN LOWER(rti.unit) = 'boxes' THEN 'boxes'::inventory_unit
              WHEN LOWER(rti.unit) = 'liter' THEN 'liters'::inventory_unit
              WHEN LOWER(rti.unit) = 'liters' THEN 'liters'::inventory_unit
              WHEN LOWER(rti.unit) = 'ml' THEN 'ml'::inventory_unit
              WHEN LOWER(rti.unit) = 'gram' THEN 'g'::inventory_unit
              WHEN LOWER(rti.unit) = 'grams' THEN 'g'::inventory_unit
              WHEN LOWER(rti.unit) = 'g' THEN 'g'::inventory_unit
              WHEN LOWER(rti.unit) = 'kg' THEN 'kg'::inventory_unit
              ELSE 'pieces'::inventory_unit
            END,
            rti.cost_per_unit,
            NOW(),
            NOW()
          FROM recipe_template_ingredients rti
          LEFT JOIN inventory_stock ist ON (
            ist.store_id = store_record.id 
            AND ist.is_active = true
            AND (
              LOWER(TRIM(ist.item)) = LOWER(TRIM(rti.ingredient_name))
              OR LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(rti.ingredient_name)) || '%'
              OR LOWER(TRIM(rti.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
            )
          )
          WHERE rti.recipe_template_id = template_record.id
            AND ist.id IS NOT NULL -- Only add if inventory item exists
            AND NOT EXISTS (
              SELECT 1 FROM recipe_ingredients ri
              WHERE ri.recipe_id = existing_recipe_id
                AND ri.inventory_stock_id = ist.id
            );
          
          GET DIAGNOSTICS ingredients_added = ROW_COUNT;
          
          IF ingredients_added > 0 THEN
            fixed_count := fixed_count + 1;
            ingredient_count := ingredient_count + ingredients_added;
            
            -- Update recipe costs
            UPDATE recipes SET
              total_cost = (
                SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, 0)), 0)
                FROM recipe_ingredients ri
                WHERE ri.recipe_id = existing_recipe_id
              ),
              cost_per_serving = (
                SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, 0)), 0) / GREATEST(serving_size, 1)
                FROM recipe_ingredients ri
                WHERE ri.recipe_id = existing_recipe_id
              ),
              updated_at = NOW()
            WHERE id = existing_recipe_id;
          END IF;
        END IF;
        
        skipped_count := skipped_count + 1;
        
        -- Ensure product catalog entry exists
        INSERT INTO product_catalog (
          store_id,
          product_name,
          description,
          price,
          recipe_id,
          category_id,
          is_available,
          created_at,
          updated_at
        )
        SELECT 
          store_record.id,
          template_record.name,
          template_record.description,
          COALESCE(template_record.suggested_price, 100.00),
          existing_recipe_id,
          (SELECT id FROM categories WHERE store_id = store_record.id AND name = template_record.category_name LIMIT 1),
          true,
          NOW(),
          NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM product_catalog pc
          WHERE pc.store_id = store_record.id 
            AND pc.recipe_id = existing_recipe_id
        );
        
        IF FOUND THEN
          product_count := product_count + 1;
        END IF;
        
        CONTINUE;
      END IF;
      
      -- Create new recipe
      INSERT INTO recipes (
        name,
        store_id,
        template_id,
        is_active,
        serving_size,
        instructions,
        total_cost,
        cost_per_serving,
        created_at,
        updated_at
      ) VALUES (
        template_record.name,
        store_record.id,
        template_record.id,
        true,
        COALESCE(template_record.serving_size, 1),
        COALESCE(template_record.instructions, 'Follow standard preparation instructions'),
        0,
        0,
        NOW(),
        NOW()
      ) RETURNING id INTO new_recipe_id;
      
      deployed_count := deployed_count + 1;
      
      -- Copy template ingredients to recipe ingredients with inventory mapping
      INSERT INTO recipe_ingredients (
        recipe_id,
        inventory_stock_id,
        quantity,
        unit,
        cost_per_unit,
        created_at,
        updated_at
      )
      SELECT 
        new_recipe_id,
        ist.id,
        rti.quantity,
        CASE 
          WHEN LOWER(rti.unit) = 'piece' THEN 'pieces'::inventory_unit
          WHEN LOWER(rti.unit) = 'pieces' THEN 'pieces'::inventory_unit
          WHEN LOWER(rti.unit) = 'pack' THEN 'packs'::inventory_unit
          WHEN LOWER(rti.unit) = 'packs' THEN 'packs'::inventory_unit
          WHEN LOWER(rti.unit) = 'box' THEN 'boxes'::inventory_unit
          WHEN LOWER(rti.unit) = 'boxes' THEN 'boxes'::inventory_unit
          WHEN LOWER(rti.unit) = 'liter' THEN 'liters'::inventory_unit
          WHEN LOWER(rti.unit) = 'liters' THEN 'liters'::inventory_unit
          WHEN LOWER(rti.unit) = 'ml' THEN 'ml'::inventory_unit
          WHEN LOWER(rti.unit) = 'gram' THEN 'g'::inventory_unit
          WHEN LOWER(rti.unit) = 'grams' THEN 'g'::inventory_unit
          WHEN LOWER(rti.unit) = 'g' THEN 'g'::inventory_unit
          WHEN LOWER(rti.unit) = 'kg' THEN 'kg'::inventory_unit
          ELSE 'pieces'::inventory_unit
        END,
        rti.cost_per_unit,
        NOW(),
        NOW()
      FROM recipe_template_ingredients rti
      LEFT JOIN inventory_stock ist ON (
        ist.store_id = store_record.id 
        AND ist.is_active = true
        AND (
          LOWER(TRIM(ist.item)) = LOWER(TRIM(rti.ingredient_name))
          OR LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(rti.ingredient_name)) || '%'
          OR LOWER(TRIM(rti.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
        )
      )
      WHERE rti.recipe_template_id = template_record.id
        AND ist.id IS NOT NULL; -- Only add if inventory item exists
      
      -- Count ingredients added for this recipe
      SELECT COUNT(*) INTO ingredients_added
      FROM recipe_template_ingredients rti
      LEFT JOIN inventory_stock ist ON (
        ist.store_id = store_record.id 
        AND ist.is_active = true
        AND (
          LOWER(TRIM(ist.item)) = LOWER(TRIM(rti.ingredient_name))
          OR LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(rti.ingredient_name)) || '%'
          OR LOWER(TRIM(rti.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
        )
      )
      WHERE rti.recipe_template_id = template_record.id
        AND ist.id IS NOT NULL;
      
      ingredient_count := ingredient_count + ingredients_added;
      
      -- Update recipe costs based on ingredients
      UPDATE recipes SET
        total_cost = (
          SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, 0)), 0)
          FROM recipe_ingredients ri
          WHERE ri.recipe_id = recipes.id
        ),
        cost_per_serving = (
          SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, 0)), 0) / GREATEST(serving_size, 1)
          FROM recipe_ingredients ri
          WHERE ri.recipe_id = recipes.id
        ),
        updated_at = NOW()
      WHERE id = new_recipe_id;
      
      -- Create product catalog entry with template suggested price
      INSERT INTO product_catalog (
        store_id,
        product_name,
        description,
        price,
        recipe_id,
        category_id,
        is_available,
        created_at,
        updated_at
      ) VALUES (
        store_record.id,
        template_record.name,
        template_record.description,
        COALESCE(template_record.suggested_price, 100.00),
        new_recipe_id,
        (SELECT id FROM categories WHERE store_id = store_record.id AND name = template_record.category_name LIMIT 1),
        true,
        NOW(),
        NOW()
      );
      
      product_count := product_count + 1;
    END LOOP;
  END LOOP;
  
  -- Return deployment statistics
  RETURN QUERY SELECT 
    deployed_count,
    fixed_count,
    ingredient_count,
    product_count,
    skipped_count,
    store_count,
    template_count,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
END;
$$;