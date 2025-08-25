-- Fixed comprehensive repair migration for Sugbo Mercado store synchronization issues
-- This migration handles inventory_stock_id constraints properly

-- Step 1: Fix incomplete recipes by adding missing ingredients with proper inventory linking
WITH incomplete_recipes AS (
  SELECT DISTINCT
    r.id as recipe_id,
    r.name as recipe_name,
    rt.id as template_id
  FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND r.is_active = true
    AND rt.is_active = true
    AND (
      SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id
    ) < (
      SELECT COUNT(*) FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id
    )
),
ingredient_insertions AS (
  INSERT INTO recipe_ingredients (
    recipe_id,
    ingredient_name,
    quantity,
    unit,
    cost_per_unit,
    inventory_stock_id,
    created_at,
    updated_at
  )
  SELECT 
    ir.recipe_id,
    rti.ingredient_name,
    rti.quantity,
    CASE 
      WHEN rti.unit::text = ANY(enum_range(NULL::inventory_unit)::text[]) 
      THEN rti.unit::inventory_unit
      ELSE 'pieces'::inventory_unit
    END,
    rti.cost_per_unit,
    -- Find or create inventory stock
    COALESCE(
      (SELECT id FROM inventory_stock 
       WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
         AND LOWER(TRIM(item_name)) = LOWER(TRIM(rti.ingredient_name))
       LIMIT 1),
      -- Create a basic inventory stock entry if none exists
      (INSERT INTO inventory_stock (
         store_id, 
         item_name, 
         current_stock, 
         unit, 
         cost_per_unit,
         minimum_threshold,
         is_active,
         created_at,
         updated_at
       )
       VALUES (
         'd7c47e6b-f20a-4543-a6bd-000398f72df5',
         rti.ingredient_name,
         0,
         CASE 
           WHEN rti.unit::text = ANY(enum_range(NULL::inventory_unit)::text[]) 
           THEN rti.unit::inventory_unit
           ELSE 'pieces'::inventory_unit
         END,
         rti.cost_per_unit,
         0,
         true,
         NOW(),
         NOW()
       )
       RETURNING id)
    ),
    NOW(),
    NOW()
  FROM incomplete_recipes ir
  JOIN recipe_template_ingredients rti ON rti.recipe_template_id = ir.template_id
  WHERE NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = ir.recipe_id
      AND LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(rti.ingredient_name))
  )
  RETURNING recipe_id
)
SELECT COUNT(*) as ingredients_added FROM ingredient_insertions;

-- Step 2: Update recipe costs after adding ingredients
UPDATE recipes SET
  total_cost = COALESCE((
    SELECT SUM(ri.quantity * ri.cost_per_unit)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ), 0),
  cost_per_serving = COALESCE((
    SELECT SUM(ri.quantity * ri.cost_per_unit) / GREATEST(recipes.serving_size, 1)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ), 0),
  updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND is_active = true;