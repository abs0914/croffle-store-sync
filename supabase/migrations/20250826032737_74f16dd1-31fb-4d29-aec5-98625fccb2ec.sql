-- Fix ingredient mappings to connect recipe ingredients to inventory stock
UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT ist.id 
  FROM inventory_stock ist 
  WHERE ist.store_id = (
    SELECT r.store_id 
    FROM recipes r 
    WHERE r.id = recipe_ingredients.recipe_id
  )
  AND (
    LOWER(TRIM(ist.item)) = LOWER(TRIM(recipe_ingredients.ingredient_name))
    OR LOWER(TRIM(ist.item)) LIKE '%' || LOWER(TRIM(recipe_ingredients.ingredient_name)) || '%'
    OR LOWER(TRIM(recipe_ingredients.ingredient_name)) LIKE '%' || LOWER(TRIM(ist.item)) || '%'
  )
  AND ist.is_active = true
  LIMIT 1
)
WHERE inventory_stock_id IS NULL;