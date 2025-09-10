-- Remove duplicate Premium - Biscoff products and keep existing Biscoff Croffle
-- This will clean up the duplication we created

-- First, remove product catalog entries for "Premium - Biscoff"
DELETE FROM product_catalog 
WHERE product_name = 'Premium - Biscoff';

-- Remove recipe ingredients for Premium - Biscoff recipes
DELETE FROM recipe_ingredients 
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE name = 'Premium - Biscoff'
);

-- Remove recipe ingredient mappings for Premium - Biscoff recipes
DELETE FROM recipe_ingredient_mappings 
WHERE recipe_id IN (
  SELECT id FROM recipes WHERE name = 'Premium - Biscoff'
);

-- Remove the recipes themselves
DELETE FROM recipes 
WHERE name = 'Premium - Biscoff';

-- Verify we kept the Biscoff Croffle entries
-- (This is just for verification, no actual changes)
SELECT 
  pc.product_name,
  pc.price,
  pc.description,
  s.name as store_name,
  c.name as category_name
FROM product_catalog pc
JOIN stores s ON pc.store_id = s.id
LEFT JOIN categories c ON pc.category_id = c.id
WHERE pc.product_name ILIKE '%biscoff%'
ORDER BY pc.product_name, s.name;