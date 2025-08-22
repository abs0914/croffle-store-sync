-- Update product catalog to link existing recipes
UPDATE product_catalog pc
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE pc.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND pc.recipe_id IS NULL
  AND LOWER(TRIM(pc.product_name)) = LOWER(TRIM(r.name))
  AND r.store_id = pc.store_id;