-- Manually create recipes for products that are missing them in Sugbo Mercado

-- Create recipe for Cookies & Cream Croffle (template exists)
INSERT INTO recipes (name, store_id, template_id, is_active, serving_size, total_cost, cost_per_serving, instructions)
SELECT 
  'Cookies & Cream Croffle',
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  rt.id,
  true,
  1,
  0,
  0,
  'Follow standard croffle preparation with cookies & cream topping'
FROM recipe_templates rt 
WHERE rt.name = 'Cookies & Cream Croffle' 
AND NOT EXISTS (
  SELECT 1 FROM recipes r 
  WHERE r.name = 'Cookies & Cream Croffle' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Create recipe for Iced Tea (template exists)  
INSERT INTO recipes (name, store_id, template_id, is_active, serving_size, total_cost, cost_per_serving, instructions)
SELECT 
  'Iced Tea',
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  rt.id,
  true,
  1,
  0,
  0,
  'Prepare refreshing iced tea with proper brewing'
FROM recipe_templates rt 
WHERE rt.name = 'ICED TEA' 
AND NOT EXISTS (
  SELECT 1 FROM recipes r 
  WHERE r.name = 'Iced Tea' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Create recipe for Lemonade (template exists)
INSERT INTO recipes (name, store_id, template_id, is_active, serving_size, total_cost, cost_per_serving, instructions)
SELECT 
  'Lemonade',
  'd7c47e6b-f20a-4543-a6bd-000398f72df5',
  rt.id,
  true,
  1,
  0,
  0,
  'Fresh lemonade with perfect balance of sweet and sour'
FROM recipe_templates rt 
WHERE rt.name = 'LEMONADE' 
AND NOT EXISTS (
  SELECT 1 FROM recipes r 
  WHERE r.name = 'Lemonade' 
  AND r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);