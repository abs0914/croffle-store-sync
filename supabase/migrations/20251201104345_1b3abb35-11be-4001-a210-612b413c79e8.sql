-- Drop duplicate foreign key constraint on recipe_ingredients table
-- Keep the standard naming convention: recipe_ingredients_inventory_stock_id_fkey
-- Remove the duplicate: fk_recipe_ingredients_inventory_stock

ALTER TABLE recipe_ingredients 
DROP CONSTRAINT IF EXISTS fk_recipe_ingredients_inventory_stock;