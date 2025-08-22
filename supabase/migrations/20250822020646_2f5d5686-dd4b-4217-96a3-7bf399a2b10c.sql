-- Create comprehensive bulk deployment function for recipe templates
CREATE OR REPLACE FUNCTION deploy_all_recipe_templates_to_all_stores()
RETURNS TABLE(
  deployed_recipes INTEGER,
  deployed_ingredients INTEGER,
  deployed_products INTEGER,
  skipped_existing INTEGER,
  total_stores INTEGER,
  total_templates INTEGER,
  execution_time_ms INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  start_time TIMESTAMP := clock_timestamp();
  store_record RECORD;
  template_record RECORD;
  recipe_id UUID;
  existing_recipe_id UUID;
  deployed_count INTEGER := 0;
  ingredient_count INTEGER := 0;
  product_count INTEGER := 0;
  skipped_count INTEGER := 0;
  store_count INTEGER := 0;
  template_count INTEGER := 0;
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
      SELECT id INTO existing_recipe_id
      FROM recipes 
      WHERE template_id = template_record.id 
        AND store_id = store_record.id 
        AND is_active = true
      LIMIT 1;
      
      IF existing_recipe_id IS NOT NULL THEN
        -- Recipe exists, skip but ensure product catalog entry exists
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
          COALESCE(calculate_recipe_suggested_price(existing_recipe_id, store_record.id), 100.00),
          existing_recipe_id,
          (SELECT id FROM categories WHERE store_id = store_record.id AND name = template_record.category_name LIMIT 1),
          true,
          NOW(),
          NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM product_catalog 
          WHERE store_id = store_record.id 
            AND recipe_id = existing_recipe_id
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
        0, -- Will be calculated after ingredients
        0, -- Will be calculated after ingredients
        NOW(),
        NOW()
      ) RETURNING id INTO recipe_id;
      
      deployed_count := deployed_count + 1;
      
      -- Copy template ingredients to recipe ingredients
      INSERT INTO recipe_ingredients (
        recipe_id,
        ingredient_name,
        quantity,
        unit,
        cost_per_unit,
        created_at,
        updated_at
      )
      SELECT 
        recipe_id,
        rti.ingredient_name,
        rti.quantity,
        rti.unit,
        rti.cost_per_unit,
        NOW(),
        NOW()
      FROM recipe_template_ingredients rti
      WHERE rti.recipe_template_id = template_record.id;
      
      GET DIAGNOSTICS ingredient_count = ingredient_count + ROW_COUNT;
      
      -- Update recipe costs based on ingredients
      UPDATE recipes SET
        total_cost = (
          SELECT COALESCE(SUM(quantity * cost_per_unit), 0)
          FROM recipe_ingredients
          WHERE recipe_id = recipes.id
        ),
        cost_per_serving = (
          SELECT COALESCE(SUM(quantity * cost_per_unit), 0) / GREATEST(serving_size, 1)
          FROM recipe_ingredients
          WHERE recipe_id = recipes.id
        ),
        updated_at = NOW()
      WHERE id = recipe_id;
      
      -- Create product catalog entry
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
        COALESCE(calculate_recipe_suggested_price(recipe_id, store_record.id), 100.00),
        recipe_id,
        (SELECT id FROM categories WHERE store_id = store_record.id AND name = template_record.category_name LIMIT 1),
        true,
        NOW(),
        NOW()
      );
      
      product_count := product_count + 1;
      
      -- Create ingredient mappings for inventory sync
      INSERT INTO recipe_ingredient_mappings (
        recipe_id,
        ingredient_name,
        inventory_stock_id,
        conversion_factor,
        created_at,
        updated_at
      )
      SELECT DISTINCT
        recipe_id,
        ri.ingredient_name,
        ist.id,
        1.0, -- Default conversion factor
        NOW(),
        NOW()
      FROM recipe_ingredients ri
      LEFT JOIN inventory_stock ist ON (
        LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
        AND ist.store_id = store_record.id
        AND ist.is_active = true
      )
      WHERE ri.recipe_id = recipe_id
        AND ist.id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM recipe_ingredient_mappings rim
          WHERE rim.recipe_id = recipe_id
            AND rim.ingredient_name = ri.ingredient_name
            AND rim.inventory_stock_id = ist.id
        );
    END LOOP;
  END LOOP;
  
  -- Return deployment statistics
  RETURN QUERY SELECT 
    deployed_count,
    ingredient_count,
    product_count,
    skipped_count,
    store_count,
    template_count,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
END;
$$;

-- Create a simpler function to deploy specific templates to all stores
CREATE OR REPLACE FUNCTION deploy_recipe_template_to_all_stores(template_id_param UUID)
RETURNS TABLE(
  deployed_recipes INTEGER,
  deployed_ingredients INTEGER,
  deployed_products INTEGER,
  skipped_existing INTEGER,
  total_stores INTEGER,
  execution_time_ms INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  start_time TIMESTAMP := clock_timestamp();
  store_record RECORD;
  template_record RECORD;
  recipe_id UUID;
  existing_recipe_id UUID;
  deployed_count INTEGER := 0;
  ingredient_count INTEGER := 0;
  product_count INTEGER := 0;
  skipped_count INTEGER := 0;
  store_count INTEGER := 0;
BEGIN
  -- Get template details
  SELECT * INTO template_record
  FROM recipe_templates 
  WHERE id = template_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipe template not found or inactive: %', template_id_param;
  END IF;
  
  -- Count active stores
  SELECT COUNT(*) INTO store_count FROM stores WHERE is_active = true;
  
  -- Deploy to all active stores
  FOR store_record IN 
    SELECT id, name FROM stores WHERE is_active = true
  LOOP
    -- Check if recipe already exists for this template and store
    SELECT id INTO existing_recipe_id
    FROM recipes 
    WHERE template_id = template_record.id 
      AND store_id = store_record.id 
      AND is_active = true
    LIMIT 1;
    
    IF existing_recipe_id IS NOT NULL THEN
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
        COALESCE(calculate_recipe_suggested_price(existing_recipe_id, store_record.id), 100.00),
        existing_recipe_id,
        (SELECT id FROM categories WHERE store_id = store_record.id AND name = template_record.category_name LIMIT 1),
        true,
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM product_catalog 
        WHERE store_id = store_record.id 
          AND recipe_id = existing_recipe_id
      );
      
      IF FOUND THEN
        product_count := product_count + 1;
      END IF;
      
      CONTINUE;
    END IF;
    
    -- Create new recipe (same logic as above)
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
    ) RETURNING id INTO recipe_id;
    
    deployed_count := deployed_count + 1;
    
    -- Copy ingredients and create mappings (same logic as above)
    INSERT INTO recipe_ingredients (
      recipe_id,
      ingredient_name,
      quantity,
      unit,
      cost_per_unit,
      created_at,
      updated_at
    )
    SELECT 
      recipe_id,
      rti.ingredient_name,
      rti.quantity,
      rti.unit,
      rti.cost_per_unit,
      NOW(),
      NOW()
    FROM recipe_template_ingredients rti
    WHERE rti.recipe_template_id = template_record.id;
    
    GET DIAGNOSTICS ingredient_count = ingredient_count + ROW_COUNT;
    
    -- Update costs
    UPDATE recipes SET
      total_cost = (
        SELECT COALESCE(SUM(quantity * cost_per_unit), 0)
        FROM recipe_ingredients
        WHERE recipe_id = recipes.id
      ),
      cost_per_serving = (
        SELECT COALESCE(SUM(quantity * cost_per_unit), 0) / GREATEST(serving_size, 1)
        FROM recipe_ingredients
        WHERE recipe_id = recipes.id
      ),
      updated_at = NOW()
    WHERE id = recipe_id;
    
    -- Create product catalog entry
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
      COALESCE(calculate_recipe_suggested_price(recipe_id, store_record.id), 100.00),
      recipe_id,
      (SELECT id FROM categories WHERE store_id = store_record.id AND name = template_record.category_name LIMIT 1),
      true,
      NOW(),
      NOW()
    );
    
    product_count := product_count + 1;
    
    -- Create ingredient mappings
    INSERT INTO recipe_ingredient_mappings (
      recipe_id,
      ingredient_name,
      inventory_stock_id,
      conversion_factor,
      created_at,
      updated_at
    )
    SELECT DISTINCT
      recipe_id,
      ri.ingredient_name,
      ist.id,
      1.0,
      NOW(),
      NOW()
    FROM recipe_ingredients ri
    LEFT JOIN inventory_stock ist ON (
      LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
      AND ist.store_id = store_record.id
      AND ist.is_active = true
    )
    WHERE ri.recipe_id = recipe_id
      AND ist.id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredient_mappings rim
        WHERE rim.recipe_id = recipe_id
          AND rim.ingredient_name = ri.ingredient_name
          AND rim.inventory_stock_id = ist.id
      );
  END LOOP;
  
  -- Return deployment statistics
  RETURN QUERY SELECT 
    deployed_count,
    ingredient_count,
    product_count,
    skipped_count,
    store_count,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
END;
$$;