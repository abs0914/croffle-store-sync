-- Create missing product catalog entries for the 2 new stores (SM City Cebu and SM Savemore Tacloban)
-- that have recipes but no product catalog entries

WITH store_recipes AS (
  SELECT 
    r.id as recipe_id,
    r.name,
    r.description,
    r.suggested_price,
    r.store_id,
    s.name as store_name,
    rt.image_url
  FROM recipes r
  JOIN stores s ON r.store_id = s.id
  LEFT JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE s.name IN ('SM City Cebu', 'SM Savemore Tacloban')
    AND r.approval_status = 'approved'
    AND NOT EXISTS (
      SELECT 1 FROM product_catalog pc 
      WHERE pc.recipe_id = r.id AND pc.store_id = r.store_id
    )
)
INSERT INTO product_catalog (
  store_id,
  recipe_id,
  product_name,
  description,
  price,
  image_url,
  is_available,
  created_at,
  updated_at
)
SELECT 
  store_id,
  recipe_id,
  name,
  COALESCE(description, 'Recipe-based product'),
  COALESCE(suggested_price, 100.00),
  image_url,
  true,
  NOW(),
  NOW()
FROM store_recipes;