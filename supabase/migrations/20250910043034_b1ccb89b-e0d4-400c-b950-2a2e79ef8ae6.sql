-- Fix missing product_id values in recipes table
-- Link recipes.product_id to products.id via product_catalog relationship
UPDATE recipes 
SET product_id = p.id,
    updated_at = NOW()
FROM product_catalog pc
JOIN products p ON (p.name = pc.product_name AND p.store_id = pc.store_id)
WHERE pc.recipe_id = recipes.id 
  AND recipes.product_id IS NULL;