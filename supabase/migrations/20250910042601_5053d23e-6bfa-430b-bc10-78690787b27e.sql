-- Fix missing product_id values in recipes table
UPDATE recipes 
SET product_id = pc.product_id,
    updated_at = NOW()
FROM product_catalog pc 
WHERE pc.recipe_id = recipes.id 
  AND recipes.product_id IS NULL;