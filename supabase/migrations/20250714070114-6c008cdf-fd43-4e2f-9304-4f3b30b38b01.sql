-- First, let's update the Mini Croffle recipe template structure
-- Remove existing ingredients for Mini Croffle and add proper grouped ingredients
DELETE FROM recipe_template_ingredients WHERE recipe_template_id = '55a665cd-f0d0-4401-b854-bf908c411e56';

-- Add base ingredients for Mini Croffle (non-customizable)
INSERT INTO recipe_template_ingredients (
  recipe_template_id, 
  ingredient_name, 
  quantity, 
  unit, 
  cost_per_unit,
  is_optional,
  group_selection_type
) VALUES 
-- Base ingredients (required, not part of choice groups)
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Regular Croissant', 0.5, 'Piece', 15, false, 'required_one'),
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Whipped Cream', 0.5, 'Serving', 4, false, 'required_one'),
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Mini Take-Out Box', 1, 'Piece', 2.4, false, 'required_one'),
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Popsicle Stick', 1, 'Piece', 0.3, false, 'required_one');

-- Add sauce choices for Mini Croffle (choose 1)
INSERT INTO recipe_template_ingredients (
  recipe_template_id, 
  ingredient_name, 
  quantity, 
  unit, 
  cost_per_unit,
  ingredient_group_name,
  is_optional,
  group_selection_type
) VALUES 
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Chocolate', 0.5, 'Portion', 1.25, 'Sauce Selection', false, 'required_one'),
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Caramel', 0.5, 'Portion', 1.25, 'Sauce Selection', false, 'required_one'),
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Tiramisu', 0.5, 'Portion', 1.25, 'Sauce Selection', false, 'required_one');

-- Add topping choices for Mini Croffle (choose 0-4)
INSERT INTO recipe_template_ingredients (
  recipe_template_id, 
  ingredient_name, 
  quantity, 
  unit, 
  cost_per_unit,
  ingredient_group_name,
  is_optional,
  group_selection_type
) VALUES 
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Colored Sprinkles', 0.5, 'Portion', 1.25, 'Toppings Selection', true, 'multiple'),
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Marshmallow', 0.5, 'Portion', 1.25, 'Toppings Selection', true, 'multiple'),
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Choco Flakes', 0.5, 'Portion', 1.25, 'Toppings Selection', true, 'multiple'),
('55a665cd-f0d0-4401-b854-bf908c411e56', 'Peanut', 0.5, 'Portion', 1.25, 'Toppings Selection', true, 'multiple');

-- Now update Croffle Overload - Remove existing and add proper structure
DELETE FROM recipe_template_ingredients WHERE recipe_template_id = 'ab43276d-7084-49f4-a454-b7b91ddb1e40';

-- Add base ingredients for Croffle Overload (non-customizable)
INSERT INTO recipe_template_ingredients (
  recipe_template_id, 
  ingredient_name, 
  quantity, 
  unit, 
  cost_per_unit,
  is_optional,
  group_selection_type
) VALUES 
-- Base ingredients (required, not part of choice groups)
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Regular Croissant', 0.5, 'Piece', 15, false, 'required_one'),
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Vanilla Ice Cream', 1, 'Scoop', 15.44, false, 'required_one'),
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Overload Cup', 1, 'Piece', 4, false, 'required_one'),
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Mini Spoon', 1, 'Piece', 0.5, false, 'required_one'),
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Popsicle Stick', 1, 'Piece', 0.3, false, 'required_one');

-- Add topping choices for Croffle Overload (choose 1-4)
INSERT INTO recipe_template_ingredients (
  recipe_template_id, 
  ingredient_name, 
  quantity, 
  unit, 
  cost_per_unit,
  ingredient_group_name,
  is_optional,
  group_selection_type
) VALUES 
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Colored Sprinkles', 1, 'Portion', 2.5, 'Toppings Selection', false, 'multiple'),
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Marshmallow', 1, 'Portion', 2.5, 'Toppings Selection', false, 'multiple'),
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Choco Flakes', 1, 'Portion', 2.5, 'Toppings Selection', false, 'multiple'),
('ab43276d-7084-49f4-a454-b7b91ddb1e40', 'Peanut', 1, 'Portion', 2.5, 'Toppings Selection', false, 'multiple');