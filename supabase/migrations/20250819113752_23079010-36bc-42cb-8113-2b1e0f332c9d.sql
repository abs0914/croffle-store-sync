-- Fix ingredient naming to match reference screenshot exactly

-- Update sauce ingredients to be more specific
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Chocolate Sauce'
WHERE ingredient_name = 'Chocolate' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Choco Nut%' OR name LIKE '%Choco Marshmallow%' OR name LIKE '%Choco Overload%' OR name LIKE '%KitKat%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Caramel Sauce'
WHERE ingredient_name = 'Caramel' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Caramel Delight%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Nutella Sauce'
WHERE ingredient_name = 'Nutella' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Nutella%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Dark Chocolate Sauce'
WHERE ingredient_name = 'Dark Chocolate' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Dark Chocolate%'
);

-- Update topping names to be more specific
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Peanut Toppings'
WHERE ingredient_name = 'Peanut' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Choco Nut%' OR name LIKE '%Croffle Overload%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Marshmallow Toppings'
WHERE ingredient_name = 'Marshmallow' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Choco Marshmallow%' OR name LIKE '%Croffle Overload%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Chocolate Flakes Toppings'
WHERE ingredient_name = 'Choco Flakes' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Choco Overload%' OR name LIKE '%Croffle Overload%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Colored Sprinkle Toppings'
WHERE ingredient_name = 'Colored Sprinkles' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Caramel Delight%' OR name LIKE '%Croffle Overload%'
);

-- Update fruit toppings
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Strawberry Toppings'
WHERE ingredient_name = 'Strawberry Jam' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Strawberry%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Blueberry Toppings'
WHERE ingredient_name = 'Blueberry Jam' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Blueberry%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Mango Toppings'
WHERE ingredient_name = 'Mango Jam' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Mango%'
);

-- Update graham cracker name
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Crushed Grahams'
WHERE ingredient_name = 'Graham Crushed' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Blueberry%' OR name LIKE '%Mango%'
);

-- Update oreo ingredients for cookies & cream
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Crushed Oreo'
WHERE ingredient_name = 'Oreo Crushed' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Cookies & Cream%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = '1pc Oreo Cookie (cut to half) Topping'
WHERE ingredient_name = 'Oreo Cookies' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Cookies & Cream%'
);

-- Update KitKat ingredient
UPDATE recipe_template_ingredients 
SET ingredient_name = '1pc Kitkat Topping'
WHERE ingredient_name = 'KitKat' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%KitKat%'
);

-- Update matcha and chocolate crumb ingredients
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Matcha Crumbs'
WHERE ingredient_name = 'Matcha' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Matcha%'
);

UPDATE recipe_template_ingredients 
SET ingredient_name = 'Chocolate Crumbs'
WHERE ingredient_name = 'Chocolate Crumbs' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name LIKE '%Dark Chocolate%'
);

-- Fix the Mini Croffe Mix & Match to have proper sauce options
DELETE FROM recipe_template_ingredients 
WHERE recipe_template_id IN (SELECT id FROM recipe_templates WHERE name LIKE '%Mini Croffle%')
AND ingredient_name NOT IN ('Regular Croissant', 'Wax Paper', 'Chopstick');

-- Add the correct sauce options for Mini Croffle Mix & Match
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT 
  rt.id,
  sauce_name,
  1,
  'portion',
  5.0
FROM recipe_templates rt,
(VALUES 
  ('Chocolate Sauce'),
  ('Caramel Sauce'), 
  ('Tiramisu Sauce')
) AS sauces(sauce_name)
WHERE rt.name LIKE '%Mini Croffle%';

-- Add the correct topping options for Mini Croffle Mix & Match  
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT 
  rt.id,
  topping_name,
  1,
  'portion',
  3.0
FROM recipe_templates rt,
(VALUES 
  ('Sprinkles'),
  ('Marshmallows'),
  ('Chocolate Flakes'), 
  ('Peanut')
) AS toppings(topping_name)
WHERE rt.name LIKE '%Mini Croffle%';