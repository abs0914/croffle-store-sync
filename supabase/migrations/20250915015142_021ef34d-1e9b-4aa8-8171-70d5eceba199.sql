-- Add missing crumble add-ons to all stores step by step
-- First create recipes from templates
WITH store_addon_categories AS (
  SELECT DISTINCT
    s.id as store_id,
    s.name as store_name,
    c.id as category_id
  FROM stores s
  JOIN categories c ON c.store_id = s.id 
  WHERE c.name ILIKE '%add%' 
    AND c.is_active = true 
    AND s.is_active = true
),
addon_templates AS (
  SELECT id, name, suggested_price 
  FROM recipe_templates 
  WHERE name IN ('Matcha Crumble', 'Chocolate Crumble', 'Crushed Grahams')
    AND is_active = true
)
INSERT INTO recipes (
  name,
  store_id,
  template_id,
  is_active,
  serving_size,
  instructions,
  total_cost,
  cost_per_serving,
  created_at,
  updated_at
)
SELECT 
  at.name,
  sac.store_id,
  at.id,
  true,
  1,
  'Sprinkle over croffle as desired',
  at.suggested_price,
  at.suggested_price,
  NOW(),
  NOW()
FROM addon_templates at
CROSS JOIN store_addon_categories sac
ON CONFLICT (store_id, name) DO NOTHING;