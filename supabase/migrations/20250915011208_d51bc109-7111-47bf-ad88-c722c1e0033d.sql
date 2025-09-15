-- Add Bending Straw ingredient to cold coffee recipe templates
-- First check if any already exist to avoid duplicates
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_category,
  created_at
) 
SELECT template_id, ingredient_name, quantity, unit, cost_per_unit, ingredient_category, created_at
FROM (VALUES 
  ('e74da28b-1354-4245-acd0-5a22ad36248e'::uuid, 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW()),
  ('1f94bcdc-de86-4afb-bf6d-6b3f1892cb0e'::uuid, 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW()),
  ('069083d5-4698-4526-b440-2a70644e5b6d'::uuid, 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW()),
  ('c648f473-0f4c-4776-a181-16e55432f788'::uuid, 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW()),
  ('755c3fcc-d5d3-477d-9a40-821ec0e2dae5'::uuid, 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW())
) AS v(template_id, ingredient_name, quantity, unit, cost_per_unit, ingredient_category, created_at)
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = v.template_id 
  AND rti.ingredient_name = v.ingredient_name
);