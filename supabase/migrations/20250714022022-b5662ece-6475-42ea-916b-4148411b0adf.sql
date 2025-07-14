-- Update product catalog entries with template images where they're missing
UPDATE product_catalog 
SET 
  image_url = rt.image_url,
  updated_at = NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE product_catalog.recipe_id = r.id 
  AND product_catalog.image_url IS NULL 
  AND rt.image_url IS NOT NULL