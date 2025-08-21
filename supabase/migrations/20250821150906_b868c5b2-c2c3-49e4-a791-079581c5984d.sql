-- Step 6-9: Complete the recipe system fix (avoiding trigger conflicts)

-- Remove duplicate recipes (keep one per name/store combination with the best data)
-- First, identify recipes to keep
CREATE TEMP TABLE recipes_to_keep AS
SELECT DISTINCT ON (name, store_id)
  id,
  name,
  store_id
FROM unified_recipes
WHERE store_id IS NOT NULL
ORDER BY name, store_id, 
         CASE WHEN total_cost > 0 THEN 1 ELSE 2 END,
         updated_at DESC;

-- Delete ingredients for duplicate recipes
DELETE FROM unified_recipe_ingredients 
WHERE recipe_id NOT IN (SELECT id FROM recipes_to_keep);

-- Delete duplicate recipes
DELETE FROM unified_recipes 
WHERE id NOT IN (SELECT id FROM recipes_to_keep);

-- Update product catalog to point to kept recipes (without triggering product creation)
-- Temporarily disable the trigger
ALTER TABLE product_catalog DISABLE TRIGGER ALL;

UPDATE product_catalog 
SET recipe_id = rtk.id,
    updated_at = NOW()
FROM recipes_to_keep rtk
WHERE product_catalog.product_name = rtk.name 
AND product_catalog.store_id = rtk.store_id;

-- Re-enable triggers
ALTER TABLE product_catalog ENABLE TRIGGER ALL;

-- Create missing inventory items for recipe ingredients
INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, cost, minimum_threshold, maximum_capacity, is_active)
SELECT DISTINCT
  ur.store_id,
  uri.ingredient_name,
  CASE 
    WHEN uri.ingredient_name ILIKE '%coffee%' OR uri.ingredient_name ILIKE '%bean%' THEN 'kg'
    WHEN uri.ingredient_name ILIKE '%milk%' OR uri.ingredient_name ILIKE '%cream%' THEN 'liters'
    WHEN uri.ingredient_name ILIKE '%syrup%' OR uri.ingredient_name ILIKE '%sauce%' THEN 'ml'
    WHEN uri.ingredient_name ILIKE '%powder%' OR uri.ingredient_name ILIKE '%sugar%' THEN 'g'
    WHEN uri.ingredient_name ILIKE '%jam%' OR uri.ingredient_name ILIKE '%spread%' THEN 'g'
    ELSE 'pieces'
  END as unit,
  100 as stock_quantity,
  uri.cost_per_unit,
  20 as minimum_threshold,
  500 as maximum_capacity,
  true
FROM unified_recipe_ingredients uri
JOIN unified_recipes ur ON uri.recipe_id = ur.id
WHERE ur.store_id IS NOT NULL
AND uri.ingredient_name != 'Unknown Ingredient'
AND NOT EXISTS (
  SELECT 1 FROM inventory_stock ist 
  WHERE ist.store_id = ur.store_id 
  AND LOWER(TRIM(ist.item)) = LOWER(TRIM(uri.ingredient_name))
  AND ist.is_active = true
)
ON CONFLICT (store_id, item) DO UPDATE SET
  cost = EXCLUDED.cost,
  is_active = true,
  updated_at = NOW();

-- Update existing products with recipe costs (direct update, no triggers)
UPDATE products 
SET 
  cost = ur.total_cost,
  price = CASE 
    WHEN products.price = 0 OR products.price IS NULL 
    THEN ur.total_cost * 2.5
    ELSE products.price
  END,
  updated_at = NOW()
FROM unified_recipes ur
JOIN product_catalog pc ON ur.id = pc.recipe_id
WHERE products.name = pc.product_name 
AND products.store_id = pc.store_id
AND ur.total_cost > 0;

-- Clean up temp table
DROP TABLE recipes_to_keep;