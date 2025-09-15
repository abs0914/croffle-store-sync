-- Add Bending Straw ingredient to cold coffee recipe templates
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  ingredient_category,
  created_at,
  updated_at
) VALUES 
-- Americano Iced
('e74da28b-1354-4245-acd0-5a22ad36248e', 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW(), NOW()),
-- Cafe Latte Iced
('1f94bcdc-de86-4afb-bf6d-6b3f1892cb0e', 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW(), NOW()),
-- Cafe Mocha Iced  
('069083d5-4698-4526-b440-2a70644e5b6d', 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW(), NOW()),
-- Cappuccino Iced
('c648f473-0f4c-4776-a181-16e55432f788', 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW(), NOW()),
-- Caramel Latte Iced
('755c3fcc-d5d3-477d-9a40-821ec0e2dae5', 'Bending Straw', 1, 'pieces', 0.50, 'base_ingredient', NOW(), NOW())

ON CONFLICT (recipe_template_id, ingredient_name) DO NOTHING;