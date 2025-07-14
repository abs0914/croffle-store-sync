-- Update Mini Croffle recipe template to enable choice groups
UPDATE recipe_templates 
SET has_choice_groups = true 
WHERE name = 'Mini Croffle';

-- Update Croffle Overload recipe template to enable choice groups  
UPDATE recipe_templates 
SET has_choice_groups = true 
WHERE name = 'Croffle Overload';

-- Update Mini Croffle ingredients with proper choice groups, cost, and types
-- Base ingredients (always included)
UPDATE recipe_template_ingredients 
SET 
  choice_group_name = 'Base',
  ingredient_type = CASE 
    WHEN ingredient_name IN ('Mini Take-Out Box', 'Popsicle Stick') THEN 'packaging'
    ELSE 'raw_material'
  END,
  group_selection_type = 'required_one',
  cost_per_unit = CASE 
    WHEN ingredient_name = 'Regular Croissant' THEN 15
    WHEN ingredient_name = 'Whipped Cream' THEN 4
    WHEN ingredient_name = 'Mini Take-Out Box' THEN 2.4
    WHEN ingredient_name = 'Popsicle Stick' THEN 0.3
  END
WHERE recipe_template_id = (SELECT id FROM recipe_templates WHERE name = 'Mini Croffle')
  AND ingredient_name IN ('Regular Croissant', 'Whipped Cream', 'Mini Take-Out Box', 'Popsicle Stick');

-- Sauce choices for Mini Croffle (user must select 1)
UPDATE recipe_template_ingredients 
SET 
  choice_group_name = 'Sauce Choice',
  ingredient_type = 'raw_material',
  group_selection_type = 'required_one',
  cost_per_unit = 1.25
WHERE recipe_template_id = (SELECT id FROM recipe_templates WHERE name = 'Mini Croffle')
  AND ingredient_name IN ('Chocolate', 'Caramel', 'Tiramisu');

-- Topping options for Mini Croffle (mark as optional/additional)
UPDATE recipe_template_ingredients 
SET 
  choice_group_name = 'Additional Toppings',
  ingredient_type = 'raw_material',
  group_selection_type = 'optional_one',
  cost_per_unit = 1.25
WHERE recipe_template_id = (SELECT id FROM recipe_templates WHERE name = 'Mini Croffle')
  AND ingredient_name IN ('Colored Sprinkles', 'Peanut', 'Choco Flakes', 'Marshmallow');

-- Update Croffle Overload ingredients with proper choice groups, cost, and types
-- Base ingredients (always included)
UPDATE recipe_template_ingredients 
SET 
  choice_group_name = 'Base',
  ingredient_type = CASE 
    WHEN ingredient_name IN ('Overload Cup', 'Popsicle Stick', 'Mini Spoon') THEN 'packaging'
    ELSE 'raw_material'
  END,
  group_selection_type = 'required_one',
  cost_per_unit = CASE 
    WHEN ingredient_name = 'Regular Croissant' THEN 15
    WHEN ingredient_name = 'Vanilla Ice Cream' THEN 15.44
    WHEN ingredient_name = 'Overload Cup' THEN 4
    WHEN ingredient_name = 'Popsicle Stick' THEN 0.3
    WHEN ingredient_name = 'Mini Spoon' THEN 0.5
  END
WHERE recipe_template_id = (SELECT id FROM recipe_templates WHERE name = 'Croffle Overload')
  AND ingredient_name IN ('Regular Croissant', 'Vanilla Ice Cream', 'Overload Cup', 'Popsicle Stick', 'Mini Spoon');

-- Topping choices for Croffle Overload (user must select 1)
UPDATE recipe_template_ingredients 
SET 
  choice_group_name = 'Topping Choice',
  ingredient_type = 'raw_material',
  group_selection_type = 'required_one',
  cost_per_unit = 2.5
WHERE recipe_template_id = (SELECT id FROM recipe_templates WHERE name = 'Croffle Overload')
  AND ingredient_name IN ('Colored Sprinkles', 'Peanut', 'Choco Flakes', 'Marshmallow');

-- Create choice group records for Mini Croffle
INSERT INTO recipe_choice_groups (
  recipe_template_id,
  group_name,
  display_name,
  selection_type,
  min_selections,
  max_selections,
  is_required,
  display_order
)
SELECT 
  rt.id,
  'Sauce Choice',
  'Choose Your Sauce',
  'required_one',
  1,
  1,
  true,
  1
FROM recipe_templates rt 
WHERE rt.name = 'Mini Croffle'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_choice_groups rcg 
    WHERE rcg.recipe_template_id = rt.id 
    AND rcg.group_name = 'Sauce Choice'
  );

-- Create choice group records for Croffle Overload
INSERT INTO recipe_choice_groups (
  recipe_template_id,
  group_name,
  display_name,
  selection_type,
  min_selections,
  max_selections,
  is_required,
  display_order
)
SELECT 
  rt.id,
  'Topping Choice',
  'Choose Your Topping',
  'required_one',
  1,
  1,
  true,
  1
FROM recipe_templates rt 
WHERE rt.name = 'Croffle Overload'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_choice_groups rcg 
    WHERE rcg.recipe_template_id = rt.id 
    AND rcg.group_name = 'Topping Choice'
  );