-- Update recipes to link them to their product catalog entries
UPDATE recipes 
SET product_id = pc.id,
    updated_at = NOW()
FROM product_catalog pc
WHERE recipes.id = pc.recipe_id 
  AND recipes.name = 'Mini Take Out Box'
  AND recipes.product_id IS NULL;