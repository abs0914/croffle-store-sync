-- Fix Choco Overload Croffle recipe: Change Choco Flakes quantity from 3 to 1
UPDATE recipe_ingredients 
SET quantity = 1, updated_at = NOW()
WHERE ingredient_name = 'Choco Flakes' 
  AND quantity = 3
  AND recipe_id IN (
    SELECT id FROM recipes 
    WHERE name = 'Choco Overload Croffle' 
      AND is_active = true
  );

-- Fix Cookies Cream Croffle recipe: Remove duplicate Oreo Cookie entries (keep only 1 piece total)
-- First, delete the extra Oreo Cookie entries (quantity = 2)
DELETE FROM recipe_ingredients 
WHERE ingredient_name = 'Oreo Cookie' 
  AND quantity = 2
  AND recipe_id IN (
    SELECT id FROM recipes 
    WHERE name ILIKE '%Cookies%Cream%Croffle%' 
      AND is_active = true
  );

-- Ensure remaining Oreo Cookie entries have quantity = 1
UPDATE recipe_ingredients 
SET quantity = 1, updated_at = NOW()
WHERE ingredient_name = 'Oreo Cookie' 
  AND recipe_id IN (
    SELECT id FROM recipes 
    WHERE name ILIKE '%Cookies%Cream%Croffle%' 
      AND is_active = true
  );