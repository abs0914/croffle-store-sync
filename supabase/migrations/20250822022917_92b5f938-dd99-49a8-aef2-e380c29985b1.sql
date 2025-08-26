-- Add ingredients to the recipe templates we just created
-- First, add ingredients to the new templates

-- Biscoff Biscuit ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Biscoff', 1, 'piece', 2.50
FROM recipe_templates rt WHERE rt.name = 'Biscoff Biscuit' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id);

-- Graham Crushed ingredients  
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Graham Crushed', 15, 'grams', 0.15
FROM recipe_templates rt WHERE rt.name = 'Graham Crushed' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id);

-- Chocolate Crumbs ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Chocolate Crumbs', 15, 'grams', 0.20
FROM recipe_templates rt WHERE rt.name = 'Chocolate Crumbs' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id);

-- Caramel Sauce ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Caramel', 15, 'ml', 0.25
FROM recipe_templates rt WHERE rt.name = 'Caramel Sauce' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id);

-- Caramel Latte (Hot) ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, ingredient, qty, unit_val, cost FROM recipe_templates rt
CROSS JOIN (VALUES
  ('Coffee', 18, 'grams', 2.50),
  ('Milk', 180, 'ml', 0.05),
  ('Caramel', 15, 'ml', 0.25),
  ('16oz Plastic Cups', 1, 'piece', 3.00),
  ('Flat Lid', 1, 'piece', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE rt.name = 'Caramel Latte (Hot)' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = ingredients.ingredient);

-- Strawberry Latte ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, ingredient, qty, unit_val, cost FROM recipe_templates rt
CROSS JOIN (VALUES
  ('Coffee', 18, 'grams', 2.50),
  ('Milk', 180, 'ml', 0.05),
  ('Strawberry Syrup', 15, 'ml', 0.30),
  ('16oz Plastic Cups', 1, 'piece', 3.00),
  ('Flat Lid', 1, 'piece', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE rt.name = 'Strawberry Latte' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = ingredients.ingredient);