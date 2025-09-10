-- COMPLETE PREMIUM IMPLEMENTATION (Step by Step)
-- Add ingredients, remaining recipes, and create mappings

-- 1. Add ingredients to Premium - Biscoff recipes
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
)
SELECT 
  r.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit::inventory_unit,
  ingredient_data.cost_per_unit
FROM recipes r
CROSS JOIN (VALUES 
  ('Regular Croissant', 1, 'pieces', 30.00),
  ('Whipped Cream', 1, 'pieces', 8.00),
  ('Biscoff Crushed', 1, 'g', 2.50),
  ('Biscoff', 1, 'pieces', 5.62),
  ('Rectangle', 1, 'pieces', 6.00),
  ('Chopstick', 1, 'pieces', 0.60),
  ('Wax Paper', 1, 'pieces', 0.70)
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit)
WHERE r.name = 'Premium - Biscoff' 
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = ingredient_data.ingredient_name
  );

-- 2. Create remaining Premium recipes one by one
-- Premium - Nutella
INSERT INTO recipes (
  name, store_id, template_id, is_active, serving_size, instructions, total_cost, cost_per_serving
)
SELECT 
  'Premium - Nutella', s.id, rt.id, true, 1, rt.instructions, 49.80, 49.80
FROM recipe_templates rt
CROSS JOIN stores s
WHERE rt.name = 'Premium - Nutella' AND rt.is_active = true AND s.is_active = true
  AND NOT EXISTS (SELECT 1 FROM recipes r WHERE r.name = 'Premium - Nutella' AND r.store_id = s.id);

-- Premium - Kitkat  
INSERT INTO recipes (
  name, store_id, template_id, is_active, serving_size, instructions, total_cost, cost_per_serving
)
SELECT 
  'Premium - Kitkat', s.id, rt.id, true, 1, rt.instructions, 54.05, 54.05
FROM recipe_templates rt
CROSS JOIN stores s  
WHERE rt.name = 'Premium - Kitkat' AND rt.is_active = true AND s.is_active = true
  AND NOT EXISTS (SELECT 1 FROM recipes r WHERE r.name = 'Premium - Kitkat' AND r.store_id = s.id);

-- Premium - Cookies & Cream
INSERT INTO recipes (
  name, store_id, template_id, is_active, serving_size, instructions, total_cost, cost_per_serving
)
SELECT 
  'Premium - Cookies & Cream', s.id, rt.id, true, 1, rt.instructions, 50.70, 50.70
FROM recipe_templates rt
CROSS JOIN stores s
WHERE rt.name = 'Premium - Cookies & Cream' AND rt.is_active = true AND s.is_active = true
  AND NOT EXISTS (SELECT 1 FROM recipes r WHERE r.name = 'Premium - Cookies & Cream' AND r.store_id = s.id);

-- 3. Add ingredients for Premium - Nutella
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Regular Croissant', 1, 'pieces'::inventory_unit, 30.00 FROM recipes r WHERE r.name = 'Premium - Nutella';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Whipped Cream', 1, 'pieces'::inventory_unit, 8.00 FROM recipes r WHERE r.name = 'Premium - Nutella';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Nutella Sauce', 1, 'g'::inventory_unit, 4.50 FROM recipes r WHERE r.name = 'Premium - Nutella';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Rectangle', 1, 'pieces'::inventory_unit, 6.00 FROM recipes r WHERE r.name = 'Premium - Nutella';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Chopstick', 1, 'pieces'::inventory_unit, 0.60 FROM recipes r WHERE r.name = 'Premium - Nutella';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Wax Paper', 1, 'pieces'::inventory_unit, 0.70 FROM recipes r WHERE r.name = 'Premium - Nutella';

-- 4. Add ingredients for Premium - Kitkat  
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Regular Croissant', 1, 'pieces'::inventory_unit, 30.00 FROM recipes r WHERE r.name = 'Premium - Kitkat';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Whipped Cream', 1, 'pieces'::inventory_unit, 8.00 FROM recipes r WHERE r.name = 'Premium - Kitkat';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Chocolate Sauce', 1, 'g'::inventory_unit, 2.50 FROM recipes r WHERE r.name = 'Premium - Kitkat';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Kitkat', 0.5, 'pieces'::inventory_unit, 6.25 FROM recipes r WHERE r.name = 'Premium - Kitkat';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Rectangle', 1, 'pieces'::inventory_unit, 6.00 FROM recipes r WHERE r.name = 'Premium - Kitkat';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Chopstick', 1, 'pieces'::inventory_unit, 0.60 FROM recipes r WHERE r.name = 'Premium - Kitkat';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Wax Paper', 1, 'pieces'::inventory_unit, 0.70 FROM recipes r WHERE r.name = 'Premium - Kitkat';

-- 5. Add ingredients for Premium - Cookies & Cream
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Regular Croissant', 1, 'pieces'::inventory_unit, 30.00 FROM recipes r WHERE r.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Whipped Cream', 1, 'pieces'::inventory_unit, 8.00 FROM recipes r WHERE r.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Crushed Oreo', 1, 'g'::inventory_unit, 2.50 FROM recipes r WHERE r.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Oreo Cookie', 1, 'pieces'::inventory_unit, 2.90 FROM recipes r WHERE r.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Rectangle', 1, 'pieces'::inventory_unit, 6.00 FROM recipes r WHERE r.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Chopstick', 1, 'pieces'::inventory_unit, 0.60 FROM recipes r WHERE r.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT r.id, 'Wax Paper', 1, 'pieces'::inventory_unit, 0.70 FROM recipes r WHERE r.name = 'Premium - Cookies & Cream';

-- 6. Create Premium categories if needed
INSERT INTO categories (store_id, name, description, is_active)
SELECT DISTINCT s.id, 'Premium', 'Premium croffle products with premium ingredients', true
FROM stores s
WHERE s.is_active = true
  AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.store_id = s.id AND LOWER(c.name) = 'premium');