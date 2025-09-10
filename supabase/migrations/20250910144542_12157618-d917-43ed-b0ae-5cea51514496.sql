-- Fix Mix & Match product recipes to match specifications from the image
-- First, update Croffle Overload template ingredients

-- Clear existing ingredients for Croffle Overload template
DELETE FROM recipe_template_ingredients 
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name = 'Croffle Overload'
);

-- Add correct ingredients for Croffle Overload based on image specifications
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit,
  NOW()
FROM recipe_templates rt
CROSS JOIN (
  VALUES 
  ('Regular Croissant', 0.5, 'pieces', 15.00),
  ('Vanilla Ice Cream', 1.0, 'scoop', 15.40),
  ('Colored Sprinkles', 1.0, 'portion', 2.50),
  ('Peanut', 1.0, 'portion', 2.50),
  ('Choco Flakes', 1.0, 'portion', 2.50),
  ('Marshmallow', 1.0, 'portion', 2.50),
  ('Overload Cup', 1.0, 'pieces', 4.00),
  ('Popsicle', 1.0, 'pieces', 0.30),
  ('Mini Spoon', 1.0, 'pieces', 0.50)
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit)
WHERE rt.name = 'Croffle Overload';

-- Clear existing ingredients for Mini Croffle template  
DELETE FROM recipe_template_ingredients 
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name = 'Mini Croffle'
);

-- Add correct ingredients for Mini Croffle based on image specifications
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at
)
SELECT 
  rt.id,
  ingredient_data.ingredient_name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost_per_unit,
  NOW()
FROM recipe_templates rt
CROSS JOIN (
  VALUES 
  ('Regular Croissant', 0.5, 'pieces', 15.00),
  ('Whipped Cream', 0.5, 'serving', 4.00),
  ('Chocolate Sauce', 1.0, 'portion', 1.25),
  ('Caramel Sauce', 1.0, 'portion', 1.25),
  ('Tiramisu', 1.0, 'portion', 1.25),
  ('Colored Sprinkles', 1.0, 'portion', 1.25),
  ('Peanut', 1.0, 'portion', 1.25),
  ('Choco Flakes', 1.0, 'portion', 1.25),
  ('Marshmallow', 1.0, 'portion', 1.25),
  ('Mini Take Out Box', 1.0, 'pieces', 2.40),
  ('Popsicle Stick', 1.0, 'pieces', 0.30)
) AS ingredient_data(ingredient_name, quantity, unit, cost_per_unit)
WHERE rt.name = 'Mini Croffle';

-- Update template costs based on new ingredients
UPDATE recipe_templates 
SET suggested_price = (
  SELECT SUM(rti.quantity * rti.cost_per_unit) * 1.5 -- Apply 50% markup
  FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = recipe_templates.id
)
WHERE name IN ('Croffle Overload', 'Mini Croffle');