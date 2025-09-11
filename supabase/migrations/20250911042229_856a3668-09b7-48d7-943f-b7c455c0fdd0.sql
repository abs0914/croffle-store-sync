-- Fix Mini Croffle and Croffle Overload inventory mappings
-- Update recipe ingredients to link to proper inventory items
UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT id FROM inventory_stock 
  WHERE LOWER(item) LIKE '%croissant%' 
  AND is_active = true 
  LIMIT 1
)
WHERE ingredient_name = 'Regular Croissant' 
AND inventory_stock_id IS NULL;

UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT id FROM inventory_stock 
  WHERE LOWER(item) LIKE '%whipped%cream%' 
  AND is_active = true 
  LIMIT 1
)
WHERE ingredient_name = 'Whipped Cream' 
AND inventory_stock_id IS NULL;

UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT id FROM inventory_stock 
  WHERE LOWER(item) LIKE '%choco%flakes%' 
  AND is_active = true 
  LIMIT 1
)
WHERE ingredient_name = 'Choco Flakes' 
AND inventory_stock_id IS NULL;

UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT id FROM inventory_stock 
  WHERE LOWER(item) LIKE '%chocolate%sauce%' 
  AND is_active = true 
  LIMIT 1
)
WHERE ingredient_name = 'Chocolate Sauce' 
AND inventory_stock_id IS NULL;

UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT id FROM inventory_stock 
  WHERE LOWER(item) LIKE '%marshmallow%' 
  AND is_active = true 
  LIMIT 1
)
WHERE ingredient_name = 'Marshmallow' 
AND inventory_stock_id IS NULL;

UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT id FROM inventory_stock 
  WHERE LOWER(item) LIKE '%caramel%sauce%' 
  AND is_active = true 
  LIMIT 1
)
WHERE ingredient_name = 'Caramel Sauce' 
AND inventory_stock_id IS NULL;