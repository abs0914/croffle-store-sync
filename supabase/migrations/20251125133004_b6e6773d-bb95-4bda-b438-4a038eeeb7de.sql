
-- Remove duplicate ingredient from Crushed Grahams recipe template
-- Keep only "Crushed Grahams" ingredient, remove "Graham Crackers"

DELETE FROM recipe_template_ingredients
WHERE id = '9a6d2606-7e60-4043-9da1-a1a79a1d9ede'
  AND ingredient_name = 'Graham Crackers'
  AND recipe_template_id = '33adc4f7-0ac6-478b-8269-01e263518fcd';
