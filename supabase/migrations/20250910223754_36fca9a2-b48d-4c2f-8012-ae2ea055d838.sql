-- Fix KitKat Croffle ingredient quantity: should be 0.5 Kitkat per croffle, not 1
UPDATE recipe_ingredients 
SET quantity = 0.5,
    updated_at = NOW()
WHERE LOWER(TRIM(ingredient_name)) = 'kitkat'
  AND quantity = 1;