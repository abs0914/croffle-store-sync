-- PREMIUM CATEGORY COMPLETE IMPLEMENTATION
-- Create Templates, Fix Costs, and Establish Inventory Mappings

-- 1. First, fix critical cost discrepancies in inventory stock
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
-- Premium - Biscoff: 30+8+2.5+5.62+6+0.6+0.7 = 53.42, markup 150% = 134
('Premium - Biscoff', 'Premium croffle with Biscoff sauce and crushed Biscoff', 'Premium', 1, 1, 'Prepare croissant base, add whipped cream, drizzle Biscoff sauce, top with crushed Biscoff and whole Biscoff piece, add chopstick and serve in wax paper with rectangle base.', 134.00, true),

-- Premium - Nutella: 30+8+4.5+6+0.6+0.7 = 49.8, markup 150% = 125
('Premium - Nutella', 'Premium croffle with rich Nutella sauce', 'Premium', 1, 1, 'Prepare croissant base, add whipped cream, generously drizzle Nutella sauce, add chopstick and serve in wax paper with rectangle base.', 125.00, true),

-- Premium - Kitkat: 30+8+2.5+6.25+6+0.6+0.7 = 54.05, markup 150% = 135
('Premium - Kitkat', 'Premium croffle with chocolate sauce and Kitkat pieces', 'Premium', 1, 1, 'Prepare croissant base, add whipped cream, drizzle chocolate sauce, top with 0.5 pieces of Kitkat, add chopstick and serve in wax paper with rectangle base.', 135.00, true),

-- Premium - Cookies & Cream: 30+8+2.5+2.9+6+0.6+0.7 = 50.7, markup 150% = 127
('Premium - Cookies & Cream', 'Premium croffle with crushed Oreo and Oreo cookie topping', 'Premium', 1, 1, 'Prepare croissant base, add whipped cream, add crushed Oreo topping and whole Oreo cookie, add chopstick and serve in wax paper with rectangle base.', 127.00, true);

-- 3. Add ingredients to Premium - Biscoff template
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit
FROM recipe_templates rt
CROSS JOIN (VALUES 
  ('Regular Croissant', 1, 'pieces', 30.00),
  ('Whipped Cream', 1, 'serving', 8.00),
  ('Biscoff Crushed', 1, 'portion', 2.50),
  ('Biscoff', 1, 'pieces', 5.62),
  ('Rectangle', 1, 'pieces', 6.00),
  ('Chopstick', 1, 'pair', 0.60),
  ('Wax Paper', 1, 'pieces', 0.70)
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit)
WHERE rt.name = 'Premium - Biscoff' AND rt.is_active = true;

-- 4. Add ingredients to Premium - Nutella template
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit
FROM recipe_templates rt
CROSS JOIN (VALUES 
  ('Regular Croissant', 1, 'pieces', 30.00),
  ('Whipped Cream', 1, 'serving', 8.00),
  ('Nutella Sauce', 1, 'portion', 4.50),
  ('Rectangle', 1, 'pieces', 6.00),
  ('Chopstick', 1, 'pair', 0.60),
  ('Wax Paper', 1, 'pieces', 0.70)
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit)
WHERE rt.name = 'Premium - Nutella' AND rt.is_active = true;

-- 5. Add ingredients to Premium - Kitkat template
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit
FROM recipe_templates rt
CROSS JOIN (VALUES 
  ('Regular Croissant', 1, 'pieces', 30.00),
  ('Whipped Cream', 1, 'serving', 8.00),
  ('Chocolate Sauce', 1, 'portion', 2.50),
  ('Kitkat', 0.5, 'pieces', 6.25),
  ('Rectangle', 1, 'pieces', 6.00),
  ('Chopstick', 1, 'pair', 0.60),
  ('Wax Paper', 1, 'pieces', 0.70)
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit)
WHERE rt.name = 'Premium - Kitkat' AND rt.is_active = true;

-- 6. Add ingredients to Premium - Cookies & Cream template
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit
FROM recipe_templates rt
CROSS JOIN (VALUES 
  ('Regular Croissant', 1, 'pieces', 30.00),
  ('Whipped Cream', 1, 'serving', 8.00),
  ('Crushed Oreo', 1, 'portion', 2.50),
  ('Oreo Cookie', 1, 'pieces', 2.90),
  ('Rectangle', 1, 'pieces', 6.00),
  ('Chopstick', 1, 'pair', 0.60),
  ('Wax Paper', 1, 'pieces', 0.70)
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit)
WHERE rt.name = 'Premium - Cookies & Cream' AND rt.is_active = true;

-- 7. Deploy Premium templates to all active stores as recipes
INSERT INTO recipes (
  name,
  store_id,
  template_id,
  is_active,
  serving_size,
  instructions,
  total_cost,
  cost_per_serving
)
SELECT 
  rt.name,
  s.id,
  rt.id,
  true,
  rt.serving_size,
  rt.instructions,
  -- Calculate total cost from template ingredients
  (SELECT COALESCE(SUM(rti.quantity * rti.cost_per_unit), 0)
   FROM recipe_template_ingredients rti 
   WHERE rti.recipe_template_id = rt.id),
  -- Calculate cost per serving
  (SELECT COALESCE(SUM(rti.quantity * rti.cost_per_unit), 0) / GREATEST(rt.serving_size, 1)
   FROM recipe_template_ingredients rti 
   WHERE rti.recipe_template_id = rt.id)
FROM recipe_templates rt
CROSS JOIN stores s
WHERE rt.name LIKE 'Premium -%' 
  AND rt.is_active = true
  AND s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.name = rt.name 
    AND r.store_id = s.id 
    AND r.template_id = rt.id
  );

-- 8. Add recipe ingredients for all deployed Premium recipes
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
)
SELECT 
  r.id,
  rti.ingredient_name,
  rti.quantity,
  CASE 
    WHEN rti.unit = 'pieces' THEN 'pieces'::inventory_unit
    WHEN rti.unit = 'serving' THEN 'pieces'::inventory_unit
    WHEN rti.unit = 'portion' THEN 'g'::inventory_unit
    WHEN rti.unit = 'pair' THEN 'pieces'::inventory_unit
    ELSE 'pieces'::inventory_unit
  END,
  rti.cost_per_unit
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_template_ingredients rti ON rti.recipe_template_id = rt.id
WHERE rt.name LIKE 'Premium -%'
  AND rt.is_active = true
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = rti.ingredient_name
  );

-- 9. Create product catalog entries for Premium products
INSERT INTO product_catalog (
  store_id,
  product_name,
  description,
  price,
  recipe_id,
  category_id,
  is_available
)
SELECT 
  r.store_id,
  r.name,
  rt.description,
  rt.suggested_price,
  r.id,
  (SELECT id FROM categories c WHERE c.store_id = r.store_id AND LOWER(c.name) LIKE '%premium%' LIMIT 1),
  true
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE rt.name LIKE 'Premium -%'
  AND rt.is_active = true
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc 
    WHERE pc.recipe_id = r.id 
    AND pc.store_id = r.store_id
  );

-- 10. Create inventory mappings for Premium recipe ingredients
INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor
)
SELECT DISTINCT
  r.id,
  ri.ingredient_name,
  ist.id,
  1.0
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN inventory_stock ist ON (
  LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
  AND ist.store_id = r.store_id
  AND ist.is_active = true
)
WHERE rt.name LIKE 'Premium -%'
  AND rt.is_active = true
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim 
    WHERE rim.recipe_id = r.id 
    AND rim.ingredient_name = ri.ingredient_name
    AND rim.inventory_stock_id = ist.id
  );