-- Add the three missing crumble add-ons to product catalog for all stores
WITH store_addon_categories AS (
  SELECT 
    s.id as store_id,
    s.name as store_name,
    c.id as category_id
  FROM stores s
  JOIN categories c ON c.store_id = s.id 
  WHERE c.name ILIKE '%add%' 
    AND c.is_active = true 
    AND s.is_active = true
),
new_addon_templates AS (
  SELECT id, name, suggested_price 
  FROM recipe_templates 
  WHERE name IN ('Matcha Crumble', 'Chocolate Crumble', 'Crushed Grahams')
    AND created_at >= NOW() - INTERVAL '10 minutes'
),
store_recipes AS (
  -- Create recipes for each store
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
    nat.name,
    sac.store_id,
    nat.id,
    true,
    1,
    'Sprinkle over croffle as desired',
    nat.suggested_price,
    nat.suggested_price,
    NOW(),
    NOW()
  FROM new_addon_templates nat
  CROSS JOIN store_addon_categories sac
  -- Only create if recipe doesn't already exist
  WHERE NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.name = nat.name 
      AND r.store_id = sac.store_id 
      AND r.template_id = nat.id
  )
  RETURNING id, name, store_id, template_id
)
-- Add to product catalog
INSERT INTO product_catalog (
  store_id,
  product_name,
  description,
  price,
  recipe_id,
  category_id,
  is_available,
  product_status,
  product_type,
  display_order,
  created_at,
  updated_at
)
SELECT 
  sr.store_id,
  sr.name,
  CASE 
    WHEN sr.name = 'Matcha Crumble' THEN 'Premium matcha-flavored crumble topping'
    WHEN sr.name = 'Chocolate Crumble' THEN 'Rich chocolate crumble topping'
    WHEN sr.name = 'Crushed Grahams' THEN 'Crushed graham crackers topping'
  END,
  CASE 
    WHEN sr.name IN ('Matcha Crumble', 'Chocolate Crumble') THEN 15.00
    WHEN sr.name = 'Crushed Grahams' THEN 12.00
  END,
  sr.id,
  sac.category_id,
  true,
  'available',
  'regular',
  0,
  NOW(),
  NOW()
FROM store_recipes sr
JOIN store_addon_categories sac ON sr.store_id = sac.store_id;