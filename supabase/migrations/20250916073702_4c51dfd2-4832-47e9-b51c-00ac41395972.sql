-- Update Choco Flakes and other topping ingredients in Croffle Overload to be Toppings choice group
UPDATE recipe_template_ingredients 
SET choice_group_name = 'Toppings', is_optional = true 
WHERE recipe_template_id = 'a7554439-dea0-4310-8681-1b35a058361d' 
AND ingredient_name IN ('Choco Flakes', 'Colored Sprinkles', 'Marshmallow', 'Peanut', 'Vanilla Ice Cream');