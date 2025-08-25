-- Comprehensive repair migration for Sugbo Mercado store synchronization issues
-- This migration will fix recipe completeness, template links, and product catalog entries

-- Step 1: Fix incomplete recipes by adding missing ingredients with proper type casting
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

-- Step 3: Link orphaned recipes to matching templates
WITH recipe_template_matches AS (
  SELECT DISTINCT ON (r.id)
    r.id as recipe_id,
    rt.id as template_id
  FROM recipes r
  JOIN recipe_templates rt ON LOWER(TRIM(r.name)) = LOWER(TRIM(rt.name))
  WHERE r.template_id IS NULL 
    AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND rt.is_active = true
  ORDER BY r.id
)
UPDATE recipes 
SET template_id = rtm.template_id,
    updated_at = NOW()
FROM recipe_template_matches rtm
WHERE recipes.id = rtm.recipe_id;

-- Step 4: Create recipes for products that don't have them
WITH products_needing_recipes AS (
  SELECT 
    pc.id as product_id,
    pc.product_name,
    pc.store_id,
    rt.id as template_id,
    rt.serving_size,
    rt.instructions
  FROM product_catalog pc
  LEFT JOIN recipes r ON pc.id = r.product_id AND r.is_active = true
  JOIN recipe_templates rt ON LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name)) 
  WHERE pc.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND pc.is_available = true
    AND r.id IS NULL
    AND rt.is_active = true
  LIMIT 20 -- Process in batches to avoid timeout
),
new_recipes AS (
  INSERT INTO recipes (
    name,
    store_id,
    product_id,
    template_id,
    is_active,
    serving_size,
    instructions,
    total_cost,
    cost_per_serving,
    created_at,
    updated_at
  )
  SELECT 
    pnr.product_name,
    pnr.store_id,
    pnr.product_id,
    pnr.template_id,
    true,
    COALESCE(pnr.serving_size, 1),
    COALESCE(pnr.instructions, 'Follow standard preparation method'),
    0,
    0,
    NOW(),
    NOW()
  FROM products_needing_recipes pnr
  RETURNING id, product_id, template_id
)
-- Add ingredients to the newly created recipes
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
  nr.id,
  rti.ingredient_name,
  rti.quantity,
  CASE 
    WHEN rti.unit::text = ANY(enum_range(NULL::inventory_unit)::text[]) 
    THEN rti.unit::inventory_unit
    ELSE 'pieces'::inventory_unit
  END,
  rti.cost_per_unit,
  NOW(),
  NOW()
FROM new_recipes nr
JOIN recipe_template_ingredients rti ON rti.recipe_template_id = nr.template_id;

-- Step 5: Final cost update for all recipes
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