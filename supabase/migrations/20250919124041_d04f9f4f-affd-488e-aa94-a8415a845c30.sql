-- Create "Plain Croffle" recipe template
INSERT INTO recipe_templates (
  name,
  description,
  category_name,
  suggested_price,
  yield_quantity,
  serving_size,
  instructions,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Plain Croffle',
  'Classic plain croffle with crispy croissant texture',
  'Plain',
  79.00,
  1,
  1,
  'Heat croissant until crispy and golden. Serve with wax paper and chopsticks.',
  true,
  NOW(),
  NOW()
);

-- Add ingredients to the Plain Croffle template
WITH template_id AS (
  SELECT id FROM recipe_templates WHERE name = 'Plain Croffle' LIMIT 1
)
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  uses_store_inventory,
  created_at
) 
SELECT 
  template_id.id,
  ingredient_data.name,
  ingredient_data.quantity,
  ingredient_data.unit,
  ingredient_data.cost,
  true,
  NOW()
FROM template_id,
(VALUES 
  ('Regular Croissant', 1, 'pieces', 25.00),
  ('Wax Paper', 1, 'pieces', 1.00),
  ('Chopstick', 1, 'pieces', 2.00)
) AS ingredient_data(name, quantity, unit, cost);

-- Deploy the new template to all stores
SELECT * FROM deploy_recipe_templates_to_all_stores_v3();