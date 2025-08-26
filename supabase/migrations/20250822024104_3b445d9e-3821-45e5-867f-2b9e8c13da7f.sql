-- Add missing ingredients to the 3 recipes in Sugbo Mercado
-- First, add ingredients using inventory_stock_id references

-- Add ingredients to Matcha recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT 
  r.id,
  ist.item,
  CASE 
    WHEN ist.item = 'Matcha Powder' THEN 15
    WHEN ist.item = '16oz Plastic Cups' THEN 1
    WHEN ist.item = 'Flat Lid' THEN 1
  END,
  ist.unit::inventory_unit,
  CASE 
    WHEN ist.item = 'Matcha Powder' THEN 5.00
    WHEN ist.item = '16oz Plastic Cups' THEN 3.00
    WHEN ist.item = 'Flat Lid' THEN 1.50
  END,
  ist.id
FROM recipes r
CROSS JOIN inventory_stock ist
WHERE r.name = 'Matcha' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item IN ('Matcha Powder', '16oz Plastic Cups', 'Flat Lid')
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.inventory_stock_id = ist.id
  );

-- Add ingredients to Oreo Cookies recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT 
  r.id,
  ist.item,
  2,
  ist.unit::inventory_unit,
  1.50,
  ist.id
FROM recipes r
CROSS JOIN inventory_stock ist
WHERE r.name = 'Oreo Cookies' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Oreo Cookie'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.inventory_stock_id = ist.id
  );

-- Add ingredients to Oreo Crushed recipe  
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit, inventory_stock_id)
SELECT 
  r.id,
  ist.item,
  25,
  ist.unit::inventory_unit,
  1.00,
  ist.id
FROM recipes r
CROSS JOIN inventory_stock ist
WHERE r.name = 'Oreo Crushed' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND ist.item = 'Crushed Oreo'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.inventory_stock_id = ist.id
  );