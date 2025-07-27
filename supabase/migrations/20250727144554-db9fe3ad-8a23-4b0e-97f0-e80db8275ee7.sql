-- Create recipe template for Croffle Overload Mix & Match
INSERT INTO recipe_templates (
  id,
  name,
  description,
  category_name,
  yield_quantity,
  serving_size,
  instructions,
  is_active
) VALUES (
  gen_random_uuid(),
  'Croffle Overload',
  'Customizable overload croffle with multiple topping choices',
  'Mix & Match',
  1,
  1,
  'Prepare croffle base with customer selected toppings and sauces',
  true
) ON CONFLICT (name) DO NOTHING;

-- Get the recipe template ID for ingredient insertion
WITH template_id AS (
  SELECT id FROM recipe_templates WHERE name = 'Croffle Overload' LIMIT 1
)
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_group_name,
  group_selection_type,
  is_optional
)
SELECT 
  template_id.id,
  'Classic Toppings',
  1,
  'serving',
  6.00,
  'topping_choice',
  'required_one',
  false
FROM template_id
UNION ALL
SELECT 
  template_id.id,
  'Premium Toppings',
  1,
  'serving',
  10.00,
  'topping_choice',
  'required_one',
  false
FROM template_id
UNION ALL
SELECT 
  template_id.id,
  'Classic Sauces',
  1,
  'serving',
  6.00,
  'sauce_choice',
  'required_one',
  false
FROM template_id
UNION ALL
SELECT 
  template_id.id,
  'Premium Sauces',
  1,
  'serving',
  8.00,
  'sauce_choice',
  'required_one',
  false
FROM template_id
ON CONFLICT (recipe_template_id, ingredient_name, ingredient_group_name) DO NOTHING;