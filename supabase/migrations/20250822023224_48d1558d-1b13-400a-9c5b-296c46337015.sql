-- Continue adding ingredients to remaining templates and fix empty recipes

-- Caramel Latte (Iced) ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, ingredient, qty, unit_val, cost FROM recipe_templates rt
CROSS JOIN (VALUES
  ('Coffee', 18, 'grams', 2.50),
  ('Milk', 180, 'ml', 0.05),
  ('Caramel', 15, 'ml', 0.25),
  ('16oz Plastic Cups', 1, 'piece', 3.00),
  ('Flat Lid', 1, 'piece', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE rt.name = 'Caramel Latte (Iced)' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = ingredients.ingredient);

-- Matcha Blended ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, ingredient, qty, unit_val, cost FROM recipe_templates rt
CROSS JOIN (VALUES
  ('Matcha Powder', 12, 'grams', 5.00),
  ('Milk', 180, 'ml', 0.05),
  ('Whipped Cream', 30, 'ml', 0.50),
  ('16oz Plastic Cups', 1, 'piece', 3.00),
  ('Flat Lid', 1, 'piece', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE rt.name = 'Matcha Blended' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = ingredients.ingredient);

-- Oreo Strawberry ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, ingredient, qty, unit_val, cost FROM recipe_templates rt
CROSS JOIN (VALUES
  ('Crushed Oreo', 30, 'grams', 1.00),
  ('Strawberry Syrup', 20, 'ml', 0.30),
  ('Milk', 180, 'ml', 0.05),
  ('Whipped Cream', 30, 'ml', 0.50),
  ('16oz Plastic Cups', 1, 'piece', 3.00),
  ('Flat Lid', 1, 'piece', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE rt.name = 'Oreo Strawberry' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = ingredients.ingredient);

-- Strawberry Kiss ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, ingredient, qty, unit_val, cost FROM recipe_templates rt
CROSS JOIN (VALUES
  ('Strawberry Syrup', 25, 'ml', 0.30),
  ('Milk', 200, 'ml', 0.05),
  ('16oz Plastic Cups', 1, 'piece', 3.00),
  ('Flat Lid', 1, 'piece', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE rt.name = 'Strawberry Kiss' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = ingredients.ingredient);

-- Vanilla Caramel ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, ingredient, qty, unit_val, cost FROM recipe_templates rt
CROSS JOIN (VALUES
  ('Vanilla Syrup', 15, 'ml', 0.30),
  ('Caramel', 15, 'ml', 0.25),
  ('Milk', 180, 'ml', 0.05),
  ('16oz Plastic Cups', 1, 'piece', 3.00),
  ('Flat Lid', 1, 'piece', 1.50)
) AS ingredients(ingredient, qty, unit_val, cost)
WHERE rt.name = 'Vanilla Caramel' AND rt.is_active = true
AND NOT EXISTS (SELECT 1 FROM recipe_template_ingredients rti WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = ingredients.ingredient);