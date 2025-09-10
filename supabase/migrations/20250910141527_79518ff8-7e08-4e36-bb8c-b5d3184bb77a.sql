-- PREMIUM CATEGORY IMPLEMENTATION (SKU-SAFE VERSION)
-- Create Templates and Fix Costs First

-- 1. Fix critical cost discrepancies in inventory stock
UPDATE inventory_stock 
SET cost = 4.50, updated_at = NOW()
WHERE item = 'Nutella Sauce' AND cost != 4.50;

UPDATE inventory_stock 
SET cost = 6.25, updated_at = NOW()
WHERE item = 'Kitkat' AND cost != 6.25;

UPDATE inventory_stock 
SET cost = 2.90, updated_at = NOW()
WHERE item = 'Oreo Cookie' AND cost != 2.90;

-- Standardize variable costs across stores  
UPDATE inventory_stock 
SET cost = 2.50, updated_at = NOW()
WHERE item = 'Biscoff Crushed' AND cost != 2.50;

UPDATE inventory_stock 
SET cost = 2.50, updated_at = NOW()
WHERE item = 'Crushed Oreo' AND cost != 2.50;

UPDATE inventory_stock 
SET cost = 5.62, updated_at = NOW()
WHERE item = 'Biscoff' AND cost != 5.62;

-- 2. Create Premium recipe templates
INSERT INTO recipe_templates (
  name, 
  description, 
  category_name, 
  serving_size, 
  yield_quantity, 
  instructions, 
  suggested_price, 
  is_active
) VALUES
('Premium - Biscoff', 'Premium croffle with Biscoff sauce and crushed Biscoff', 'Premium', 1, 1, 'Prepare croissant base, add whipped cream, drizzle Biscoff sauce, top with crushed Biscoff and whole Biscoff piece, add chopstick and serve in wax paper with rectangle base.', 134.00, true),
('Premium - Nutella', 'Premium croffle with rich Nutella sauce', 'Premium', 1, 1, 'Prepare croissant base, add whipped cream, generously drizzle Nutella sauce, add chopstick and serve in wax paper with rectangle base.', 125.00, true),
('Premium - Kitkat', 'Premium croffle with chocolate sauce and Kitkat pieces', 'Premium', 1, 1, 'Prepare croissant base, add whipped cream, drizzle chocolate sauce, top with 0.5 pieces of Kitkat, add chopstick and serve in wax paper with rectangle base.', 135.00, true),
('Premium - Cookies & Cream', 'Premium croffle with crushed Oreo and Oreo cookie topping', 'Premium', 1, 1, 'Prepare croissant base, add whipped cream, add crushed Oreo topping and whole Oreo cookie, add chopstick and serve in wax paper with rectangle base.', 127.00, true);

-- 3. Add all ingredients to Premium templates
-- Premium - Biscoff ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Regular Croissant', 1, 'pieces', 30.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Biscoff';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Whipped Cream', 1, 'serving', 8.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Biscoff';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Biscoff Crushed', 1, 'portion', 2.50 FROM recipe_templates rt WHERE rt.name = 'Premium - Biscoff';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Biscoff', 1, 'pieces', 5.62 FROM recipe_templates rt WHERE rt.name = 'Premium - Biscoff';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Rectangle', 1, 'pieces', 6.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Biscoff';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Chopstick', 1, 'pair', 0.60 FROM recipe_templates rt WHERE rt.name = 'Premium - Biscoff';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Wax Paper', 1, 'pieces', 0.70 FROM recipe_templates rt WHERE rt.name = 'Premium - Biscoff';

-- Premium - Nutella ingredients  
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Regular Croissant', 1, 'pieces', 30.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Nutella';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Whipped Cream', 1, 'serving', 8.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Nutella';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Nutella Sauce', 1, 'portion', 4.50 FROM recipe_templates rt WHERE rt.name = 'Premium - Nutella';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Rectangle', 1, 'pieces', 6.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Nutella';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Chopstick', 1, 'pair', 0.60 FROM recipe_templates rt WHERE rt.name = 'Premium - Nutella';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Wax Paper', 1, 'pieces', 0.70 FROM recipe_templates rt WHERE rt.name = 'Premium - Nutella';

-- Premium - Kitkat ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Regular Croissant', 1, 'pieces', 30.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Kitkat';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Whipped Cream', 1, 'serving', 8.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Kitkat';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Chocolate Sauce', 1, 'portion', 2.50 FROM recipe_templates rt WHERE rt.name = 'Premium - Kitkat';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Kitkat', 0.5, 'pieces', 6.25 FROM recipe_templates rt WHERE rt.name = 'Premium - Kitkat';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Rectangle', 1, 'pieces', 6.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Kitkat';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Chopstick', 1, 'pair', 0.60 FROM recipe_templates rt WHERE rt.name = 'Premium - Kitkat';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Wax Paper', 1, 'pieces', 0.70 FROM recipe_templates rt WHERE rt.name = 'Premium - Kitkat';

-- Premium - Cookies & Cream ingredients
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Regular Croissant', 1, 'pieces', 30.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Whipped Cream', 1, 'serving', 8.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Crushed Oreo', 1, 'portion', 2.50 FROM recipe_templates rt WHERE rt.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Oreo Cookie', 1, 'pieces', 2.90 FROM recipe_templates rt WHERE rt.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Rectangle', 1, 'pieces', 6.00 FROM recipe_templates rt WHERE rt.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Chopstick', 1, 'pair', 0.60 FROM recipe_templates rt WHERE rt.name = 'Premium - Cookies & Cream';
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT rt.id, 'Wax Paper', 1, 'pieces', 0.70 FROM recipe_templates rt WHERE rt.name = 'Premium - Cookies & Cream';