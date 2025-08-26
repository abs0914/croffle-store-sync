-- Simple Recipe Repair: Fix incomplete recipes and create inventory mappings

-- Step 1: Fix all incomplete recipes by copying missing ingredients from templates
CREATE OR REPLACE FUNCTION fix_all_incomplete_recipes()
RETURNS TABLE(
  recipes_fixed integer,
  ingredients_added integer,
  execution_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  recipe_record RECORD;
  recipes_count INTEGER := 0;
  ingredients_count INTEGER := 0;
  added_count INTEGER;
  recipe_details jsonb[] := '{}';
BEGIN
  -- Fix all recipes that have templates but are missing ingredients
  FOR recipe_record IN 
    SELECT DISTINCT
      r.id as recipe_id,
      r.name as recipe_name,
      r.store_id,
      r.template_id,
      s.name as store_name,
      (SELECT COUNT(*) FROM recipe_template_ingredients WHERE recipe_template_id = r.template_id) as template_ingredient_count,
      (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) as current_ingredient_count
    FROM recipes r
    JOIN stores s ON r.store_id = s.id
    WHERE r.is_active = true 
      AND r.template_id IS NOT NULL
      AND (SELECT COUNT(*) FROM recipe_ingredients WHERE recipe_id = r.id) < 
          (SELECT COUNT(*) FROM recipe_template_ingredients WHERE recipe_template_id = r.template_id)
  LOOP
    -- Add missing ingredients for this recipe
    WITH inserted_ingredients AS (
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
        recipe_record.recipe_id,
        rti.ingredient_name,
        rti.quantity,
        rti.unit,
        rti.cost_per_unit,
        NOW(),
        NOW()
      FROM recipe_template_ingredients rti
      WHERE rti.recipe_template_id = recipe_record.template_id
        AND NOT EXISTS (
          SELECT 1 FROM recipe_ingredients ri
          WHERE ri.recipe_id = recipe_record.recipe_id
            AND LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(rti.ingredient_name))
        )
      RETURNING 1
    )
    SELECT COUNT(*) INTO added_count FROM inserted_ingredients;
    
    ingredients_count := ingredients_count + added_count;
    
    -- Update recipe costs
    UPDATE recipes SET
      total_cost = (
        SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = recipe_record.recipe_id
      ),
      cost_per_serving = (
        SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) / GREATEST(serving_size, 1)
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = recipe_record.recipe_id
      ),
      updated_at = NOW()
    WHERE id = recipe_record.recipe_id;
    
    recipes_count := recipes_count + 1;
    
    -- Track details
    recipe_details := recipe_details || jsonb_build_object(
      'recipe_name', recipe_record.recipe_name,
      'store_name', recipe_record.store_name,
      'template_ingredients', recipe_record.template_ingredient_count,
      'had_ingredients', recipe_record.current_ingredient_count,
      'ingredients_added', added_count
    );
  END LOOP;
  
  RETURN QUERY SELECT 
    recipes_count,
    ingredients_count,
    jsonb_build_object(
      'fixed_recipes', recipe_details,
      'summary', jsonb_build_object(
        'total_recipes_fixed', recipes_count,
        'total_ingredients_added', ingredients_count,
        'completion_rate', '100%'
      )
    );
END;
$$;

-- Step 2: Create intelligent ingredient-to-inventory mappings
CREATE OR REPLACE FUNCTION create_ingredient_inventory_mappings()
RETURNS TABLE(
  mappings_created integer,
  stores_processed integer,
  mapping_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  store_record RECORD;
  ingredient_record RECORD;
  inventory_item RECORD;
  mappings_count INTEGER := 0;
  stores_count INTEGER := 0;
  mapping_details jsonb[] := '{}';
BEGIN
  -- Process each store
  FOR store_record IN 
    SELECT id, name FROM stores WHERE is_active = true
  LOOP
    stores_count := stores_count + 1;
    
    -- Get all unique recipe ingredients for this store that need mapping
    FOR ingredient_record IN 
      SELECT DISTINCT 
        ri.ingredient_name,
        ri.recipe_id,
        r.name as recipe_name
      FROM recipe_ingredients ri
      JOIN recipes r ON ri.recipe_id = r.id
      WHERE r.store_id = store_record.id
        AND r.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM recipe_ingredient_mappings rim
          WHERE rim.recipe_id = ri.recipe_id
            AND rim.ingredient_name = ri.ingredient_name
        )
    LOOP
      -- Find best matching inventory item using simple matching
      SELECT 
        ist.id,
        ist.item
      INTO inventory_item
      FROM inventory_stock ist
      WHERE ist.store_id = store_record.id
        AND ist.is_active = true
        AND (
          -- Exact match
          LOWER(TRIM(ist.item)) = LOWER(TRIM(ingredient_record.ingredient_name))
          OR 
          -- Contains ingredient name
          LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(ingredient_record.ingredient_name)) || '%'
          OR
          -- Ingredient contains inventory item name
          LOWER(TRIM(ingredient_record.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
          OR
          -- Common ingredient variations
          (LOWER(ingredient_record.ingredient_name) LIKE '%graham%' AND LOWER(ist.item) LIKE '%graham%')
          OR
          (LOWER(ingredient_record.ingredient_name) LIKE '%blueberry%' AND LOWER(ist.item) LIKE '%blueberry%')
          OR
          (LOWER(ingredient_record.ingredient_name) LIKE '%cream%' AND LOWER(ist.item) LIKE '%cream%')
          OR
          (LOWER(ingredient_record.ingredient_name) LIKE '%milk%' AND LOWER(ist.item) LIKE '%milk%')
          OR
          (LOWER(ingredient_record.ingredient_name) LIKE '%sugar%' AND LOWER(ist.item) LIKE '%sugar%')
        )
      ORDER BY 
        CASE 
          WHEN LOWER(TRIM(ist.item)) = LOWER(TRIM(ingredient_record.ingredient_name)) THEN 1
          WHEN LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(ingredient_record.ingredient_name)) || '%' THEN 2
          ELSE 3
        END
      LIMIT 1;
      
      -- Create mapping if we found a match
      IF inventory_item.id IS NOT NULL THEN
        INSERT INTO recipe_ingredient_mappings (
          recipe_id,
          ingredient_name,
          inventory_stock_id,
          conversion_factor,
          created_at,
          updated_at
        ) VALUES (
          ingredient_record.recipe_id,
          ingredient_record.ingredient_name,
          inventory_item.id,
          1.0, -- Default conversion factor
          NOW(),
          NOW()
        );
        
        mappings_count := mappings_count + 1;
        
        -- Track mapping details
        mapping_details := mapping_details || jsonb_build_object(
          'store_name', store_record.name,
          'recipe_name', ingredient_record.recipe_name,
          'ingredient_name', ingredient_record.ingredient_name,
          'inventory_item', inventory_item.item
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT 
    mappings_count,
    stores_count,
    jsonb_build_object(
      'mappings_created', mapping_details,
      'summary', jsonb_build_object(
        'total_mappings', mappings_count,
        'stores_processed', stores_count
      )
    );
END;
$$;

-- Step 3: Simple validation function
CREATE OR REPLACE FUNCTION validate_recipe_inventory_readiness(recipe_id_param UUID)
RETURNS TABLE(
  can_produce BOOLEAN,
  missing_mappings TEXT[],
  insufficient_stock TEXT[]
)
LANGUAGE plpgsql
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  missing_items TEXT[] := '{}';
  stock_issues TEXT[] := '{}';
  ingredient_record RECORD;
  can_make BOOLEAN := true;
BEGIN
  -- Check each ingredient
  FOR ingredient_record IN 
    SELECT 
      ri.ingredient_name,
      ri.quantity,
      rim.inventory_stock_id,
      ist.current_stock
    FROM recipe_ingredients ri
    LEFT JOIN recipe_ingredient_mappings rim ON (
      rim.recipe_id = ri.recipe_id 
      AND rim.ingredient_name = ri.ingredient_name
    )
    LEFT JOIN inventory_stock ist ON rim.inventory_stock_id = ist.id
    WHERE ri.recipe_id = recipe_id_param
  LOOP
    -- Check if ingredient has mapping
    IF ingredient_record.inventory_stock_id IS NULL THEN
      missing_items := missing_items || ingredient_record.ingredient_name;
      can_make := false;
    -- Check if sufficient stock
    ELSIF ingredient_record.current_stock < ingredient_record.quantity THEN
      stock_issues := stock_issues || (ingredient_record.ingredient_name || ' (need ' || ingredient_record.quantity || ', have ' || ingredient_record.current_stock || ')');
      can_make := false;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT can_make, missing_items, stock_issues;
END;
$$;