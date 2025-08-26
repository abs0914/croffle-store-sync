-- Fix ambiguous column reference issues in the deployment and repair functions

DROP FUNCTION IF EXISTS public.deploy_and_fix_recipe_templates_to_all_stores();
DROP FUNCTION IF EXISTS public.repair_recipe_template_links();

-- Enhanced deployment function (fixed)
CREATE OR REPLACE FUNCTION public.deploy_and_fix_recipe_templates_to_all_stores()
RETURNS TABLE(deployed_recipes integer, fixed_recipes integer, deployed_ingredients integer, deployed_products integer, skipped_existing integer, total_stores integer, total_templates integer, execution_time_ms integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
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
                SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
                FROM recipe_ingredients ri
                WHERE ri.recipe_id = existing_recipe_id
              ),
              cost_per_serving = (
                SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) / GREATEST(serving_size, 1)
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
          COALESCE(calculate_recipe_suggested_price(existing_recipe_id, store_record.id), 100.00),
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
      ) RETURNING id INTO new_recipe_id;
      
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
        new_recipe_id,
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
      FROM recipe_template_ingredients rti
      WHERE rti.recipe_template_id = template_record.id;
      
      ingredient_count := ingredient_count + ingredients_added;
      
      -- Update recipe costs based on ingredients
      UPDATE recipes SET
        total_cost = (
          SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
          FROM recipe_ingredients ri
          WHERE ri.recipe_id = recipes.id
        ),
        cost_per_serving = (
          SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) / GREATEST(serving_size, 1)
          FROM recipe_ingredients ri
          WHERE ri.recipe_id = recipes.id
        ),
        updated_at = NOW()
      WHERE id = new_recipe_id;
      
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
        COALESCE(calculate_recipe_suggested_price(new_recipe_id, store_record.id), 100.00),
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
$function$;

-- Repair recipe template links function (fixed)
CREATE OR REPLACE FUNCTION public.repair_recipe_template_links()
RETURNS TABLE(action_type text, product_name text, template_name text, recipe_id uuid, template_id uuid, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Step 1: Link existing recipes to templates where names match but template_id is NULL
  RETURN QUERY
  WITH recipe_template_matches AS (
    SELECT DISTINCT ON (r.id)
      r.id as matched_recipe_id,
      r.name as recipe_name,
      rt.id as matched_template_id,
      rt.name as template_name
    FROM recipes r
    LEFT JOIN recipe_templates rt ON LOWER(TRIM(r.name)) = LOWER(TRIM(rt.name))
    WHERE r.template_id IS NULL 
      AND rt.id IS NOT NULL
      AND rt.is_active = true
    ORDER BY r.id, 
      CASE 
        WHEN LOWER(TRIM(r.name)) = LOWER(TRIM(rt.name)) THEN 1
        ELSE 2
      END
  ),
  recipe_updates AS (
    UPDATE recipes 
    SET template_id = rtm.matched_template_id,
        updated_at = NOW()
    FROM recipe_template_matches rtm
    WHERE recipes.id = rtm.matched_recipe_id
    RETURNING id, name, template_id
  )
  SELECT 
    'linked_existing_recipe'::TEXT,
    ru.name,
    (SELECT rt.name FROM recipe_templates rt WHERE rt.id = ru.template_id),
    ru.id,
    ru.template_id,
    true,
    NULL::TEXT
  FROM recipe_updates ru;

  -- Step 2: Create missing recipes for products that have matching templates but no recipe
  RETURN QUERY
  WITH missing_recipe_products AS (
    SELECT DISTINCT ON (pc.id)
      pc.id as product_id,
      pc.product_name,
      pc.store_id,
      rt.id as matched_template_id,
      rt.name as template_name
    FROM product_catalog pc
    LEFT JOIN recipes r ON (r.id = pc.recipe_id AND r.is_active = true)
    LEFT JOIN recipe_templates rt ON LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name))
    WHERE (pc.recipe_id IS NULL OR r.id IS NULL)
      AND rt.id IS NOT NULL
      AND rt.is_active = true
      AND pc.is_available = true
    ORDER BY pc.id,
      CASE 
        WHEN LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name)) THEN 1
        ELSE 2
      END
  ),
  new_recipes AS (
    INSERT INTO recipes (
      name, 
      store_id, 
      template_id, 
      is_active, 
      serving_size, 
      total_cost, 
      cost_per_serving,
      instructions
    )
    SELECT 
      mrp.product_name,
      mrp.store_id,
      mrp.matched_template_id,
      true,
      1,
      0,
      0,
      'Auto-generated recipe from template: ' || mrp.template_name
    FROM missing_recipe_products mrp
    RETURNING id, name, template_id, store_id
  ),
  catalog_updates AS (
    UPDATE product_catalog 
    SET recipe_id = nr.id,
        updated_at = NOW()
    FROM new_recipes nr
    WHERE product_catalog.product_name = nr.name 
      AND product_catalog.store_id = nr.store_id
      AND product_catalog.recipe_id IS NULL
    RETURNING product_catalog.id, product_catalog.product_name, recipe_id
  )
  SELECT 
    'created_missing_recipe'::TEXT,
    nr.name,
    (SELECT rt.name FROM recipe_templates rt WHERE rt.id = nr.template_id),
    nr.id,
    nr.template_id,
    true,
    NULL::TEXT
  FROM new_recipes nr;
END;
$function$;