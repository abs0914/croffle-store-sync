-- Systematically add missing ingredients to recipes based on logical ingredient matching
-- This will fix the widespread issue of recipes having no ingredients configured

-- First, let's add ingredients for basic croffle recipes
-- Mango Croffle -> Mango Jam
INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
SELECT 
  r.id as recipe_id,
  ist.id as inventory_stock_id,
  1.0 as quantity,
  'pieces' as unit,
  now() as created_at
FROM recipes r
CROSS JOIN LATERAL (
  SELECT ist.id, ist.item, ist.store_id
  FROM inventory_stock ist 
  WHERE ist.is_active = true
  AND (
    -- Match Mango products with Mango Jam
    (LOWER(r.name) LIKE '%mango%' AND LOWER(ist.item) LIKE '%mango%jam%')
    OR
    -- Match Blueberry products with Blueberry Jam  
    (LOWER(r.name) LIKE '%blueberry%' AND LOWER(ist.item) LIKE '%blueberry%jam%')
    OR
    -- Match Strawberry products with Strawberry Jam
    (LOWER(r.name) LIKE '%strawberry%' AND LOWER(ist.item) LIKE '%strawberry%jam%')
    OR
    -- Match Chocolate products with Chocolate Syrup
    (LOWER(r.name) LIKE '%choco%' AND LOWER(ist.item) LIKE '%chocolate%syrup%')
    OR
    -- Match Caramel products with Caramel Syrup
    (LOWER(r.name) LIKE '%caramel%' AND LOWER(ist.item) LIKE '%caramel%syrup%')
    OR
    -- Match Biscoff products with Biscoff Spread
    (LOWER(r.name) LIKE '%biscoff%' AND LOWER(ist.item) LIKE '%biscoff%')
  )
  LIMIT 1
) ist
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_ingredients ri 
  WHERE ri.recipe_id = r.id
)
AND r.name IS NOT NULL
AND r.id IS NOT NULL;