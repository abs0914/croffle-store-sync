-- Update recipe prices and create product catalog entries for Mini Take Out Box
WITH updated_recipes AS (
  UPDATE recipes 
  SET suggested_price = 7.50,
      total_cost = 5.00,
      cost_per_serving = 5.00,
      updated_at = NOW()
  WHERE name = 'Mini Take Out Box' 
    AND product_id IS NULL
  RETURNING id, store_id, name, description, suggested_price, total_cost, template_id, is_active
)
INSERT INTO product_catalog (
  store_id, 
  product_name, 
  description, 
  price, 
  is_available, 
  recipe_id, 
  image_url, 
  category_id, 
  display_order
)
SELECT 
  ur.store_id,
  ur.name,
  COALESCE(ur.description, 'Mini Take Out Box'),
  ur.suggested_price,
  ur.is_active,
  ur.id,
  rt.image_url,
  c.id as category_id,
  0 as display_order
FROM updated_recipes ur
JOIN recipe_templates rt ON ur.template_id = rt.id
JOIN categories c ON c.store_id = ur.store_id AND c.name = 'Add-on' AND c.is_active = true;