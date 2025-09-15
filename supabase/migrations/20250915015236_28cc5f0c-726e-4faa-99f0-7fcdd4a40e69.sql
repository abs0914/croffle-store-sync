-- Add the crumble add-ons to product catalog
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
addon_recipes AS (
  SELECT r.id as recipe_id, r.name, r.store_id
  FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name IN ('Matcha Crumble', 'Chocolate Crumble', 'Crushed Grahams')
    AND r.is_active = true
)
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
  ar.store_id,
  ar.name,
  CASE 
    WHEN ar.name = 'Matcha Crumble' THEN 'Premium matcha-flavored crumble topping'
    WHEN ar.name = 'Chocolate Crumble' THEN 'Rich chocolate crumble topping'
    WHEN ar.name = 'Crushed Grahams' THEN 'Crushed graham crackers topping'
  END,
  CASE 
    WHEN ar.name IN ('Matcha Crumble', 'Chocolate Crumble') THEN 15.00
    WHEN ar.name = 'Crushed Grahams' THEN 12.00
  END,
  ar.recipe_id,
  sac.category_id,
  true,
  'available',
  'regular',
  0,
  NOW(),
  NOW()
FROM addon_recipes ar
JOIN store_addon_categories sac ON ar.store_id = sac.store_id
WHERE NOT EXISTS (
  SELECT 1 FROM product_catalog pc 
  WHERE pc.recipe_id = ar.recipe_id 
    AND pc.store_id = ar.store_id
);