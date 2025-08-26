-- Fix Recipe System: Clean duplicates, update costs, and fix mappings

-- Step 1: Remove duplicate recipe ingredients (keep the first one of each duplicate)
WITH duplicate_ingredients AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY recipe_id, ingredient_name ORDER BY created_at) as rn
  FROM unified_recipe_ingredients
)
DELETE FROM unified_recipe_ingredients 
WHERE id IN (
  SELECT id FROM duplicate_ingredients WHERE rn > 1
);

-- Step 2: Fix "Unknown Ingredient" names by mapping to inventory items
-- Map common ingredients that might be unnamed
UPDATE unified_recipe_ingredients 
SET ingredient_name = 'Coffee Beans'
WHERE ingredient_name = 'Unknown Ingredient' 
AND recipe_id IN (
  SELECT id FROM unified_recipes 
  WHERE name ILIKE '%americano%' OR name ILIKE '%espresso%' OR name ILIKE '%coffee%'
);

UPDATE unified_recipe_ingredients 
SET ingredient_name = 'Milk'
WHERE ingredient_name = 'Unknown Ingredient' 
AND recipe_id IN (
  SELECT id FROM unified_recipes 
  WHERE name ILIKE '%latte%' OR name ILIKE '%cappuccino%' OR name ILIKE '%milk%'
);

UPDATE unified_recipe_ingredients 
SET ingredient_name = 'Sugar'
WHERE ingredient_name = 'Unknown Ingredient' 
AND recipe_id IN (
  SELECT id FROM unified_recipes 
  WHERE name ILIKE '%sweet%' OR name ILIKE '%sugar%'
);

-- Step 3: Update ingredient costs from inventory stock
UPDATE unified_recipe_ingredients 
SET cost_per_unit = COALESCE(ist.cost, 5.0)
FROM inventory_stock ist
WHERE LOWER(TRIM(unified_recipe_ingredients.ingredient_name)) = LOWER(TRIM(ist.item))
AND ist.is_active = true
AND (unified_recipe_ingredients.cost_per_unit = 0 OR unified_recipe_ingredients.cost_per_unit IS NULL);

-- Step 4: Set default costs for ingredients that still have no cost
UPDATE unified_recipe_ingredients 
SET cost_per_unit = CASE 
  WHEN ingredient_name ILIKE '%coffee%' THEN 15.0
  WHEN ingredient_name ILIKE '%milk%' THEN 8.0
  WHEN ingredient_name ILIKE '%sugar%' THEN 3.0
  WHEN ingredient_name ILIKE '%syrup%' THEN 12.0
  WHEN ingredient_name ILIKE '%cream%' THEN 10.0
  WHEN ingredient_name ILIKE '%chocolate%' THEN 25.0
  WHEN ingredient_name ILIKE '%vanilla%' THEN 18.0
  WHEN ingredient_name ILIKE '%biscoff%' THEN 20.0
  WHEN ingredient_name ILIKE '%jam%' THEN 15.0
  WHEN ingredient_name = 'Unknown Ingredient' THEN 5.0
  ELSE 10.0
END
WHERE cost_per_unit = 0 OR cost_per_unit IS NULL;

-- Step 5: Recalculate recipe total costs and cost per serving
UPDATE unified_recipes 
SET 
  total_cost = COALESCE(ingredient_totals.total_ingredient_cost, 0),
  cost_per_serving = COALESCE(ingredient_totals.total_ingredient_cost, 0) / GREATEST(serving_size, 1),
  updated_at = NOW()
FROM (
  SELECT 
    recipe_id,
    SUM(quantity * cost_per_unit) as total_ingredient_cost
  FROM unified_recipe_ingredients
  GROUP BY recipe_id
) AS ingredient_totals
WHERE unified_recipes.id = ingredient_totals.recipe_id;

-- Step 6: Remove duplicate recipes (keep the most recent one per name/store combination)
WITH duplicate_recipes AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY name, store_id 
      ORDER BY 
        CASE WHEN total_cost > 0 THEN 1 ELSE 2 END,
        updated_at DESC
    ) as rn
  FROM unified_recipes
  WHERE store_id IS NOT NULL
),
recipes_to_delete AS (
  SELECT id FROM duplicate_recipes WHERE rn > 1
)
DELETE FROM unified_recipe_ingredients 
WHERE recipe_id IN (SELECT id FROM recipes_to_delete);

DELETE FROM unified_recipes 
WHERE id IN (
  SELECT id FROM duplicate_recipes WHERE rn > 1
);

-- Step 7: Update product catalog to point to the correct unified recipes
UPDATE product_catalog 
SET recipe_id = kept_recipes.id
FROM (
  SELECT DISTINCT ON (ur.name, ur.store_id)
    ur.id,
    ur.name,
    ur.store_id
  FROM unified_recipes ur
  WHERE ur.store_id IS NOT NULL
  ORDER BY ur.name, ur.store_id, ur.updated_at DESC
) AS kept_recipes
WHERE product_catalog.product_name = kept_recipes.name 
AND product_catalog.store_id = kept_recipes.store_id;

-- Step 8: Create missing inventory items for ingredients that don't exist
INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, cost, minimum_threshold, maximum_capacity, is_active)
SELECT DISTINCT
  ur.store_id,
  uri.ingredient_name,
  CASE 
    WHEN uri.ingredient_name ILIKE '%coffee%' THEN 'kg'
    WHEN uri.ingredient_name ILIKE '%milk%' THEN 'liters'
    WHEN uri.ingredient_name ILIKE '%syrup%' THEN 'ml'
    WHEN uri.ingredient_name ILIKE '%powder%' THEN 'g'
    ELSE 'pieces'
  END as unit,
  50 as stock_quantity,
  uri.cost_per_unit,
  10 as minimum_threshold,
  200 as maximum_capacity,
  true
FROM unified_recipe_ingredients uri
JOIN unified_recipes ur ON uri.recipe_id = ur.id
WHERE ur.store_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM inventory_stock ist 
  WHERE ist.store_id = ur.store_id 
  AND LOWER(TRIM(ist.item)) = LOWER(TRIM(uri.ingredient_name))
  AND ist.is_active = true
)
ON CONFLICT (store_id, item) DO UPDATE SET
  cost = EXCLUDED.cost,
  is_active = true;