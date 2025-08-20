-- Remove ice and water ingredients from recipe templates

-- Phase 1: Remove Ice ingredients from recipes
DELETE FROM recipe_template_ingredients 
WHERE ingredient_name ILIKE '%ice%' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name IN (
    'Americano (Iced)', 'Cafe Latte (Iced)', 'Cafe Mocha (Iced)', 
    'Cappuccino (Iced)', 'Matcha Blended', 'Oreo Strawberry Blended', 
    'Strawberry Kiss Blended', 'Vanilla Caramel Iced'
  )
);

-- Phase 2: Remove water ingredients from Americano recipes
DELETE FROM recipe_template_ingredients 
WHERE ingredient_name ILIKE '%water%' 
AND ingredient_name NOT ILIKE '%bottled water%'
AND recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name LIKE '%Americano%'
);

-- Phase 3: Recalculate recipe costs for affected templates
UPDATE recipe_templates 
SET total_cost = (
  SELECT COALESCE(SUM(rti.quantity * rti.cost_per_unit), 0)
  FROM recipe_template_ingredients rti
  WHERE rti.recipe_template_id = recipe_templates.id
),
cost_per_serving = (
  SELECT COALESCE(SUM(rti.quantity * rti.cost_per_unit), 0) / GREATEST(recipe_templates.serving_size, 1)
  FROM recipe_template_ingredients rti
  WHERE rti.recipe_template_id = recipe_templates.id
)
WHERE name IN (
  'Americano (Hot)', 'Americano (Iced)', 'Cafe Latte (Iced)', 
  'Cafe Mocha (Iced)', 'Cappuccino (Iced)', 'Matcha Blended', 
  'Oreo Strawberry Blended', 'Strawberry Kiss Blended', 
  'Vanilla Caramel Iced'
);

-- Phase 4: Update suggested prices based on new costs
UPDATE recipe_templates 
SET suggested_price = ROUND(total_cost * 1.5, 0)
WHERE name IN (
  'Americano (Hot)', 'Americano (Iced)', 'Cafe Latte (Iced)', 
  'Cafe Mocha (Iced)', 'Cappuccino (Iced)', 'Matcha Blended', 
  'Oreo Strawberry Blended', 'Strawberry Kiss Blended', 
  'Vanilla Caramel Iced'
);

-- Clean up any orphaned inventory stock items for ice and water (excluding bottled water)
DELETE FROM inventory_stock 
WHERE LOWER(item) IN ('ice', 'water', 'hot water', 'cold water')
AND LOWER(item) NOT LIKE '%bottled%';

-- Log the changes
INSERT INTO recipe_deployments (
  template_id,
  store_id,
  deployed_by,
  cost_snapshot,
  price_snapshot,
  deployment_notes,
  created_at
)
SELECT 
  rt.id,
  s.id,
  (SELECT user_id FROM app_users WHERE role IN ('admin', 'owner') LIMIT 1),
  rt.total_cost,
  rt.suggested_price,
  'Removed complimentary ice and water ingredients - cost optimization',
  NOW()
FROM recipe_templates rt
CROSS JOIN stores s
WHERE rt.name IN (
  'Americano (Hot)', 'Americano (Iced)', 'Cafe Latte (Iced)', 
  'Cafe Mocha (Iced)', 'Cappuccino (Iced)', 'Matcha Blended', 
  'Oreo Strawberry Blended', 'Strawberry Kiss Blended', 
  'Vanilla Caramel Iced'
) AND s.is_active = true;