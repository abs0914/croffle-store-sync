-- Create product catalog entries for Mini Take Out Box recipes that don't have them yet
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
  r.store_id,
  r.name,
  r.description,
  r.suggested_price,
  r.is_active,
  r.id,
  rt.image_url,
  c.id as category_id,
  0 as display_order
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN categories c ON c.store_id = r.store_id AND c.name = 'Add-on' AND c.is_active = true
WHERE r.name = 'Mini Take Out Box' 
  AND r.product_id IS NULL
  AND r.suggested_price > 0
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc 
    WHERE pc.recipe_id = r.id
  );