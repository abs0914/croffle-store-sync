-- Fix inventory units to match enum values, then add recipe ingredients

-- Update inventory units to match enum
UPDATE inventory_stock 
SET unit = 'g' 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND item = 'Matcha Powder' 
  AND unit = 'Grams';

UPDATE inventory_stock 
SET unit = 'pieces' 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND item IN ('16oz Plastic Cups', 'Flat Lid', 'Oreo Cookie') 
  AND unit = 'Pieces';

UPDATE inventory_stock 
SET unit = 'g' 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND item = 'Crushed Oreo' 
  AND unit = 'portions';

-- Now add ingredients to the 3 recipes
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