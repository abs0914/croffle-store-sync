-- Add missing crumble add-on recipe templates
INSERT INTO recipe_templates (
  name,
  category_name,
  description,
  instructions,
  serving_size,
  suggested_price,
  is_active,
  created_at,
  updated_at
) VALUES 
('Matcha Crumble', 'addon', 'Premium matcha-flavored crumble topping', 'Sprinkle over croffle as desired', 1, 15.00, true, NOW(), NOW()),
('Chocolate Crumble', 'addon', 'Rich chocolate crumble topping', 'Sprinkle over croffle as desired', 1, 15.00, true, NOW(), NOW()),
('Crushed Grahams', 'addon', 'Crushed graham crackers topping', 'Sprinkle over croffle as desired', 1, 12.00, true, NOW(), NOW());

-- Add ingredients for these recipe templates
WITH new_templates AS (
  SELECT id, name FROM recipe_templates 
  WHERE name IN ('Matcha Crumble', 'Chocolate Crumble', 'Crushed Grahams')
  AND created_at >= NOW() - INTERVAL '1 minute'
)
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at
)
SELECT 
  nt.id,
  CASE 
    WHEN nt.name = 'Matcha Crumble' THEN 'Matcha Crumble Mix'
    WHEN nt.name = 'Chocolate Crumble' THEN 'Chocolate Crumble Mix'
    WHEN nt.name = 'Crushed Grahams' THEN 'Graham Crackers'
  END,
  1,
  'pieces',
  CASE 
    WHEN nt.name = 'Matcha Crumble' THEN 15.00
    WHEN nt.name = 'Chocolate Crumble' THEN 15.00
    WHEN nt.name = 'Crushed Grahams' THEN 12.00
  END,
  NOW()
FROM new_templates nt;