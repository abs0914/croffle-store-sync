-- Fix missing product_id values in recipes table
-- Link recipes.product_id to product_catalog.id based on existing recipe_id relationship
UPDATE recipes 
SET product_id = pc.id,
    updated_at = NOW()
FROM product_catalog pc 
WHERE pc.recipe_id = recipes.id 
  AND recipes.product_id IS NULL;