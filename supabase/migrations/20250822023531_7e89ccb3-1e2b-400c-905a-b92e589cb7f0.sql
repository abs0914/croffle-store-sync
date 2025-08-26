-- Add ingredients to existing recipes that are missing them in Sugbo Mercado (with correct enum values)

-- Add ingredients to Matcha recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, ingredient, qty, unit_val::inventory_unit, cost FROM recipes r
CROSS JOIN (VALUES
  ('Matcha Powder', 15, 'g', 5.00),
  ('16oz Plastic Cups', 1, 'pieces', 3.00),
  ('Flat Lid', 1, 'pieces', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE r.name = 'Matcha' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = ingredients.ingredient
  );

-- Add ingredients to Oreo Cookies recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, ingredient, qty, unit_val::inventory_unit, cost FROM recipes r
CROSS JOIN (VALUES
  ('Oreo Cookie', 2, 'pieces', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE r.name = 'Oreo Cookies' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = ingredients.ingredient
  );

-- Add ingredients to Oreo Crushed recipe  
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, ingredient, qty, unit_val::inventory_unit, cost FROM recipes r
CROSS JOIN (VALUES
  ('Crushed Oreo', 25, 'g', 1.00)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE r.name = 'Oreo Crushed' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = ingredients.ingredient
  );