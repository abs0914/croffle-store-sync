-- Remove duplicate Bottled Water ingredient with zero stock from recipe
-- This is the ingredient causing transaction failures because it has 0 stock
DELETE FROM recipe_ingredients 
WHERE id = 'f6a55504-fc50-4365-b7a4-93386e3b997e' 
  AND recipe_id = '0df5bf85-e4b6-479f-be7d-511b0250a3f1'
  AND inventory_stock_id = '8ec5a59c-7905-4cc6-9853-42e692d02b0e';

-- Add a comment to track what was cleaned up
COMMENT ON TABLE recipe_ingredients IS 'Cleaned up duplicate Bottled Water ingredient (zero stock) on 2025-11-08';