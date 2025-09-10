-- Fix whipped cream deduction: Update all recipes to use 1 serving per croffle instead of 50 pieces
-- This corrects the inventory deduction to be 1 serving per transaction

UPDATE recipe_ingredients 
SET quantity = 1,
    updated_at = NOW()
WHERE LOWER(TRIM(ingredient_name)) = 'whipped cream'
  AND quantity = 50;

-- Verification: Show updated whipped cream quantities
SELECT 
  r.name as recipe_name,
  ri.ingredient_name,
  ri.quantity,
  ri.unit
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
WHERE LOWER(TRIM(ri.ingredient_name)) = 'whipped cream'
ORDER BY r.name;