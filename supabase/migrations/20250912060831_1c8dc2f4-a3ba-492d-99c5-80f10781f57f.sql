-- Safe deletion of Oreo Crushed recipe from all stores
-- Step 1: Remove from product catalog first to prevent new sales
DELETE FROM product_catalog 
WHERE LOWER(TRIM(product_name)) = 'oreo crushed';

-- Step 2: Remove recipe ingredients 
DELETE FROM recipe_ingredients 
WHERE recipe_id IN (
  SELECT id FROM recipes 
  WHERE LOWER(TRIM(name)) = 'oreo crushed'
);

-- Step 3: Remove unified recipe ingredients (if any exist)
DELETE FROM unified_recipe_ingredients 
WHERE recipe_id IN (
  SELECT id FROM unified_recipes 
  WHERE LOWER(TRIM(name)) = 'oreo crushed'
);

-- Step 4: Remove from unified recipes
DELETE FROM unified_recipes 
WHERE LOWER(TRIM(name)) = 'oreo crushed';

-- Step 5: Remove from recipes table
DELETE FROM recipes 
WHERE LOWER(TRIM(name)) = 'oreo crushed';

-- Step 6: Clean up any recipe ingredient mappings
DELETE FROM recipe_ingredient_mappings 
WHERE recipe_id NOT IN (SELECT id FROM recipes WHERE is_active = true);