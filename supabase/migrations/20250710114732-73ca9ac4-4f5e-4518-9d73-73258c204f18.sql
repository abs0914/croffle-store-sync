-- Add Choice-Based Croffle Recipes (Fixed)
-- Insert Croffle Overload Template
INSERT INTO recipe_templates (
  name, 
  description, 
  category_name, 
  suggested_price, 
  yield_quantity, 
  preparation_time, 
  is_active,
  has_choice_groups
) VALUES (
  'Croffle Overload', 
  'Indulgent croffle with ice cream and customizable toppings served in a special cup', 
  'Croffle Overload', 
  99.00, 
  1, 
  10, 
  true,
  true
);

-- Insert Mini Croffle Template
INSERT INTO recipe_templates (
  name, 
  description, 
  category_name, 
  suggested_price, 
  yield_quantity, 
  preparation_time, 
  is_active,
  has_choice_groups
) VALUES (
  'Mini Croffle', 
  'Bite-sized croffle with whipped cream and choice of flavor toppings', 
  'Mini Croffle', 
  65.00, 
  1, 
  8, 
  true,
  true
);

-- Croffle Overload Base Ingredients
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_type,
  ingredient_group_name,
  group_selection_type,
  is_optional
) 
SELECT 
  rt.id,
  ingredient_data.name,
  ingredient_data.qty,
  ingredient_data.unit_measure,
  ingredient_data.cost,
  'base',
  'Base Ingredients',
  'required_one',
  false
FROM recipe_templates rt,
(VALUES 
  ('REGULAR CROISSANT', 0.5, 'piece', 15.0),
  ('Vanilla Ice Cream', 1, 'scoop', 15.44)
) AS ingredient_data(name, qty, unit_measure, cost)
WHERE rt.name = 'Croffle Overload';

-- Choice ingredients for Croffle Overload
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_type,
  ingredient_group_name,
  group_selection_type,
  is_optional
) 
SELECT 
  rt.id,
  ingredient_data.name,
  ingredient_data.qty,
  ingredient_data.unit_measure,
  ingredient_data.cost,
  'choice',
  'Flavor Choice',
  'optional_one',
  true
FROM recipe_templates rt,
(VALUES 
  ('Colored Sprinkles', 1, 'portion', 2.5),
  ('Peanut', 1, 'portion', 2.5),
  ('Choco Flakes', 1, 'portion', 2.5),
  ('Marshmallow', 1, 'portion', 2.5)
) AS ingredient_data(name, qty, unit_measure, cost)
WHERE rt.name = 'Croffle Overload';

-- Packaging ingredients for Croffle Overload
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_type,
  ingredient_group_name,
  group_selection_type,
  is_optional
) 
SELECT 
  rt.id,
  ingredient_data.name,
  ingredient_data.qty,
  ingredient_data.unit_measure,
  ingredient_data.cost,
  'packaging',
  'Packaging',
  'required_one',
  false
FROM recipe_templates rt,
(VALUES 
  ('Overload Cup', 1, 'piece', 4.0),
  ('Popsicle stick', 1, 'piece', 0.3),
  ('Mini Spoon', 1, 'piece', 0.5)
) AS ingredient_data(name, qty, unit_measure, cost)
WHERE rt.name = 'Croffle Overload';

-- Mini Croffle Base Ingredients
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_type,
  ingredient_group_name,
  group_selection_type,
  is_optional
) 
SELECT 
  rt.id,
  ingredient_data.name,
  ingredient_data.qty,
  ingredient_data.unit_measure,
  ingredient_data.cost,
  'base',
  'Base Ingredients',
  'required_one',
  false
FROM recipe_templates rt,
(VALUES 
  ('REGULAR CROISSANT', 0.5, 'piece', 15.0),
  ('WHIPPED CREAM', 0.5, 'serving', 4.0)
) AS ingredient_data(name, qty, unit_measure, cost)
WHERE rt.name = 'Mini Croffle';

-- Choice ingredients for Mini Croffle
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_type,
  ingredient_group_name,
  group_selection_type,
  is_optional
) 
SELECT 
  rt.id,
  ingredient_data.name,
  ingredient_data.qty,
  ingredient_data.unit_measure,
  ingredient_data.cost,
  'choice',
  'Flavor Choice',
  'optional_one',
  true
FROM recipe_templates rt,
(VALUES 
  ('Chocolate', 0.5, 'portion', 1.25),
  ('Caramel', 0.5, 'portion', 1.25),
  ('Tiramisu', 0.5, 'portion', 1.25),
  ('Colored Sprinkles', 0.5, 'portion', 1.25),
  ('Peanut', 0.5, 'portion', 1.25),
  ('Choco Flakes', 0.5, 'portion', 1.25),
  ('Marshmallow', 0.5, 'portion', 1.25)
) AS ingredient_data(name, qty, unit_measure, cost)
WHERE rt.name = 'Mini Croffle';

-- Packaging ingredients for Mini Croffle
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_type,
  ingredient_group_name,
  group_selection_type,
  is_optional
) 
SELECT 
  rt.id,
  ingredient_data.name,
  ingredient_data.qty,
  ingredient_data.unit_measure,
  ingredient_data.cost,
  'packaging',
  'Packaging',
  'required_one',
  false
FROM recipe_templates rt,
(VALUES 
  ('Mini Take Out Box', 1, 'piece', 2.4),
  ('Popsicle stick', 1, 'piece', 0.3)
) AS ingredient_data(name, qty, unit_measure, cost)
WHERE rt.name = 'Mini Croffle';