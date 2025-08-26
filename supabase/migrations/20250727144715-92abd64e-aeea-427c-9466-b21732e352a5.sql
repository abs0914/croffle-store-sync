-- Create recipe template for Croffle Overload Mix & Match
INSERT INTO recipe_templates (
  name,
  description,
  category_name,
  yield_quantity,
  serving_size,
  instructions,
  is_active
) VALUES (
  'Croffle Overload',
  'Customizable overload croffle with multiple topping choices',
  'Mix & Match',
  1,
  1,
  'Prepare croffle base with customer selected toppings and sauces',
  true
);

-- Insert ingredients for the Croffle Overload template
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
  rt.id,
  'Classic Toppings',
  1,
  'serving',
  6.00,
  'topping_choice',
  'required_one'::ingredient_group_selection_type,
  false
FROM recipe_templates rt 
WHERE rt.name = 'Croffle Overload'
UNION ALL
SELECT 
  rt.id,
  'Premium Toppings',
  1,
  'serving',
  10.00,
  'topping_choice',
  'required_one'::ingredient_group_selection_type,
  false
FROM recipe_templates rt 
WHERE rt.name = 'Croffle Overload'
UNION ALL
SELECT 
  rt.id,
  'Classic Sauces',
  1,
  'serving',
  6.00,
  'sauce_choice',
  'required_one'::ingredient_group_selection_type,
  false
FROM recipe_templates rt 
WHERE rt.name = 'Croffle Overload'
UNION ALL
SELECT 
  rt.id,
  'Premium Sauces',
  1,
  'serving',
  8.00,
  'sauce_choice',
  'required_one'::ingredient_group_selection_type,
  false
FROM recipe_templates rt 
WHERE rt.name = 'Croffle Overload';