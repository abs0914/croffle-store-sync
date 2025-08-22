-- Add ingredients to Oreo Cookies and Oreo Crushed recipes

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