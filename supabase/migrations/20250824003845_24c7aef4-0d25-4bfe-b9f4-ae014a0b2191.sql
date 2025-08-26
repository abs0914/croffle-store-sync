-- Create function to audit recipe completeness
CREATE OR REPLACE FUNCTION audit_recipe_completeness()
RETURNS TABLE(
  recipe_id UUID,
  recipe_name TEXT,
  store_name TEXT,
  store_id UUID,
  template_id UUID,
  template_ingredients_count BIGINT,
  recipe_ingredients_count BIGINT,
  missing_ingredients TEXT[],
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN QUERY
  WITH template_ingredient_counts AS (
    SELECT 
      rt.id as template_id,
      rt.name as template_name,
      COUNT(rti.id) as ingredient_count,
      array_agg(rti.ingredient_name ORDER BY rti.ingredient_name) as template_ingredients
    FROM recipe_templates rt
    LEFT JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
    WHERE rt.is_active = true
    GROUP BY rt.id, rt.name
  ),
  recipe_ingredient_counts AS (
    SELECT 
      r.id as recipe_id,
      r.name as recipe_name,
      r.template_id,
      r.store_id,
      s.name as store_name,
      COUNT(ri.id) as ingredient_count,
      array_agg(ri.ingredient_name ORDER BY ri.ingredient_name) FILTER (WHERE ri.ingredient_name IS NOT NULL) as recipe_ingredients
    FROM recipes r
    JOIN stores s ON r.store_id = s.id
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE r.is_active = true 
      AND r.template_id IS NOT NULL
      AND s.is_active = true
    GROUP BY r.id, r.name, r.template_id, r.store_id, s.name
  )
  SELECT 
    ric.recipe_id::UUID,
    ric.recipe_name::TEXT,
    ric.store_name::TEXT,
    ric.store_id::UUID,
    ric.template_id::UUID,
    tic.ingredient_count::BIGINT as template_ingredients_count,
    ric.ingredient_count::BIGINT as recipe_ingredients_count,
    CASE 
      WHEN tic.template_ingredients IS NOT NULL AND ric.recipe_ingredients IS NOT NULL THEN
        array(SELECT unnest(tic.template_ingredients) EXCEPT SELECT unnest(ric.recipe_ingredients))
      WHEN tic.template_ingredients IS NOT NULL AND ric.recipe_ingredients IS NULL THEN
        tic.template_ingredients
      ELSE 
        ARRAY[]::TEXT[]
    END as missing_ingredients,
    CASE 
      WHEN ric.ingredient_count < tic.ingredient_count THEN 'incomplete'::TEXT
      ELSE 'complete'::TEXT
    END as status
  FROM recipe_ingredient_counts ric
  LEFT JOIN template_ingredient_counts tic ON ric.template_id = tic.template_id
  WHERE tic.ingredient_count > 0
    AND (ric.ingredient_count < tic.ingredient_count OR ric.ingredient_count = 0)
  ORDER BY ric.store_name, ric.recipe_name;
END;
$$;

-- Create enhanced deployment function that fixes incomplete recipes
CREATE OR REPLACE FUNCTION deploy_and_fix_recipe_templates_to_all_stores()
RETURNS TABLE(
  deployed_recipes INTEGER,
  fixed_recipes INTEGER,
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
      SELECT id INTO existing_recipe_id
      FROM recipes 
      WHERE template_id = template_record.id 
        AND store_id = store_record.id 
        AND is_active = true
      LIMIT 1;
      
      IF existing_recipe_id IS NOT NULL THEN
        -- Recipe exists - check if ingredients are complete
        SELECT COUNT(*) INTO existing_ingredient_count
        FROM recipe_ingredients 
        WHERE recipe_id = existing_recipe_id;
        
        SELECT COUNT(*) INTO template_ingredient_count
        FROM recipe_template_ingredients 
        WHERE recipe_template_id = template_record.id;
        
        IF existing_ingredient_count < template_ingredient_count THEN
          -- Fix incomplete recipe by adding missing ingredients
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
            existing_recipe_id,
            rti.ingredient_name,
            rti.quantity,
            rti.unit,
            rti.cost_per_unit,
            NOW(),
            NOW()
          FROM recipe_template_ingredients rti
          WHERE rti.recipe_template_id = template_record.id
            AND NOT EXISTS (
              SELECT 1 FROM recipe_ingredients ri
              WHERE ri.recipe_id = existing_recipe_id
                AND LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(rti.ingredient_name))
            );
          
          GET DIAGNOSTICS ingredients_added = ROW_COUNT;
          
          IF ingredients_added > 0 THEN
            fixed_count := fixed_count + 1;
            ingredient_count := ingredient_count + ingredients_added;
            
            -- Update recipe costs
            UPDATE recipes SET
              total_cost = (
                SELECT COALESCE(SUM(quantity * cost_per_unit), 0)
                FROM recipe_ingredients
                WHERE recipe_id = existing_recipe_id
              ),
              cost_per_serving = (
                SELECT COALESCE(SUM(quantity * cost_per_unit), 0) / GREATEST(serving_size, 1)
                FROM recipe_ingredients
                WHERE recipe_id = existing_recipe_id
              ),
              updated_at = NOW()
            WHERE id = existing_recipe_id;
            
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
              existing_recipe_id,
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
            WHERE ri.recipe_id = existing_recipe_id
              AND ist.id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM recipe_ingredient_mappings rim
                WHERE rim.recipe_id = existing_recipe_id
                  AND rim.ingredient_name = ri.ingredient_name
                  AND rim.inventory_stock_id = ist.id
              );
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
      
      -- Create new recipe (existing logic)
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
      
      -- Count ingredients added for this recipe
      SELECT COUNT(*) INTO ingredients_added
      FROM recipe_template_ingredients 
      WHERE recipe_template_id = template_record.id;
      
      ingredient_count := ingredient_count + ingredients_added;
      
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
    fixed_count,
    ingredient_count,
    product_count,
    skipped_count,
    store_count,
    template_count,
    EXTRACT(MILLISECONDS FROM clock_timestamp() - start_time)::INTEGER;
END;
$$;