-- Add Bending Straw to cold coffee recipes that don't have it yet
-- This will add 1 Bending Straw (pieces) to each cold coffee recipe

WITH cold_coffee_recipes AS (
  SELECT r.id as recipe_id, r.store_id, r.name as recipe_name
  FROM recipes r 
  WHERE r.name IN ('Americano Iced', 'Cafe Latte Iced', 'Cafe Mocha Iced', 'Cappuccino Iced', 'Caramel Latte Iced')
  AND r.is_active = true
),
bending_straw_inventory AS (
  SELECT ist.id as inventory_stock_id, ist.store_id
  FROM inventory_stock ist
  WHERE ist.item = 'Bending Straw' AND ist.is_active = true
),
missing_bending_straw AS (
  SELECT 
    ccr.recipe_id,
    ccr.recipe_name,
    bsi.inventory_stock_id,
    ccr.store_id
  FROM cold_coffee_recipes ccr
  JOIN bending_straw_inventory bsi ON ccr.store_id = bsi.store_id
  WHERE NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = ccr.recipe_id 
    AND ri.inventory_stock_id = bsi.inventory_stock_id
  )
)
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
  mbs.recipe_id,
  mbs.inventory_stock_id,
  1,
  'pieces'::inventory_unit,
  0.50,
  NOW(),
  NOW()
FROM missing_bending_straw mbs;