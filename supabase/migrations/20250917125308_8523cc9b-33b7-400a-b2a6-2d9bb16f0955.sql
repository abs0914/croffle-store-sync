-- Fix Mini Croffle ingredient choice groups for proper POS display and inventory deduction
-- This will ensure "Chocolate Sauce" is displayed correctly instead of "Chocolate"

-- Update sauce ingredients to be in "sauce" choice group
UPDATE recipe_template_ingredients 
SET ingredient_group_name = 'sauce',
    group_selection_type = 'required_one'
WHERE recipe_template_id IN (
    SELECT id FROM recipe_templates WHERE name ILIKE '%mini croffle%'
)
AND ingredient_name IN ('Chocolate Sauce', 'Caramel Sauce', 'Tiramisu');

-- Update topping ingredients to be in "topping" choice group  
UPDATE recipe_template_ingredients 
SET ingredient_group_name = 'topping',
    group_selection_type = 'required_multiple'
WHERE recipe_template_id IN (
    SELECT id FROM recipe_templates WHERE name ILIKE '%mini croffle%'
)
AND ingredient_name IN ('Choco Flakes', 'Colored Sprinkles', 'Marshmallow', 'Peanut');

-- Keep base ingredients (Regular Croissant, Whipped Cream, packaging) without choice groups
-- as they are always included