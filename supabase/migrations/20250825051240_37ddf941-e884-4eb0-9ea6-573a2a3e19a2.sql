-- Create and execute the recipe completion function
CREATE OR REPLACE FUNCTION complete_recipe_ingredients()
RETURNS TABLE(
  recipes_updated INTEGER,
  ingredients_added INTEGER,
  categories_processed TEXT[],
  execution_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  recipe_record RECORD;
  category_record RECORD;
  ingredient_record RECORD;
  recipes_count INTEGER := 0;
  ingredients_count INTEGER := 0;
  categories_list TEXT[] := '{}';
  recipe_details JSONB[] := '{}';
  recipe_category TEXT;
  added_count INTEGER;
BEGIN
  -- Process each active recipe
  FOR recipe_record IN 
    SELECT DISTINCT
      r.id as recipe_id,
      r.name as recipe_name,
      r.store_id,
      s.name as store_name,
      LOWER(COALESCE(pc.product_name, r.name)) as product_name
    FROM recipes r
    JOIN stores s ON r.store_id = s.id
    LEFT JOIN product_catalog pc ON pc.recipe_id = r.id
    WHERE r.is_active = true 
      AND s.is_active = true
  LOOP
    -- Determine product category from name
    recipe_category := CASE 
      WHEN recipe_record.product_name LIKE '%croffle%' THEN 'croffle'
      WHEN recipe_record.product_name LIKE '%coffee%' THEN 'coffee'
      WHEN recipe_record.product_name LIKE '%tea%' OR recipe_record.product_name LIKE '%juice%' THEN 'beverage'
      ELSE 'default'
    END;
    
    added_count := 0;
    
    -- Process each ingredient category for this product type
    FOR category_record IN 
      SELECT * FROM recipe_ingredient_categories ric
      WHERE ric.product_category = recipe_category OR ric.product_category = 'default'
    LOOP
      -- Add missing ingredients from this category
      FOR ingredient_record IN 
        SELECT unnest(category_record.required_ingredients) as ingredient_name
      LOOP
        -- Check if ingredient already exists in recipe
        IF NOT EXISTS (
          SELECT 1 FROM recipe_ingredients ri
          WHERE ri.recipe_id = recipe_record.recipe_id
            AND LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(ingredient_record.ingredient_name))
        ) THEN
          -- Check if ingredient exists in store inventory
          IF EXISTS (
            SELECT 1 FROM inventory_stock ist
            WHERE ist.store_id = recipe_record.store_id
              AND ist.is_active = true
              AND LOWER(TRIM(ist.item)) = LOWER(TRIM(ingredient_record.ingredient_name))
          ) THEN
            -- Add the missing ingredient
            INSERT INTO recipe_ingredients (
              recipe_id,
              ingredient_name,
              quantity,
              unit,
              cost_per_unit,
              created_at,
              updated_at
            ) VALUES (
              recipe_record.recipe_id,
              ingredient_record.ingredient_name,
              CASE 
                WHEN category_record.ingredient_category = 'packaging' THEN 1
                WHEN category_record.ingredient_category = 'base_ingredient' THEN 1
                ELSE 0.5 -- Default for toppings/sauces
              END,
              CASE 
                WHEN category_record.ingredient_category = 'packaging' THEN 'pieces'::inventory_unit
                ELSE 'g'::inventory_unit -- Use grams for food ingredients
              END,
              COALESCE((
                SELECT cost FROM inventory_stock 
                WHERE store_id = recipe_record.store_id 
                  AND LOWER(TRIM(item)) = LOWER(TRIM(ingredient_record.ingredient_name))
                LIMIT 1
              ), 1.0),
              NOW(),
              NOW()
            );
            
            ingredients_count := ingredients_count + 1;
            added_count := added_count + 1;
          END IF;
        END IF;
      END LOOP;
      
      -- Track categories processed
      IF NOT (category_record.ingredient_category::text = ANY(categories_list)) THEN
        categories_list := categories_list || category_record.ingredient_category::text;
      END IF;
    END LOOP;
    
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
      'product_category', recipe_category,
      'ingredients_added', added_count
    );
  END LOOP;
  
  RETURN QUERY SELECT 
    recipes_count,
    ingredients_count,
    categories_list,
    jsonb_build_object(
      'updated_recipes', recipe_details,
      'summary', jsonb_build_object(
        'total_recipes_updated', recipes_count,
        'total_ingredients_added', ingredients_count,
        'categories_processed', categories_list
      )
    );
END;
$$;