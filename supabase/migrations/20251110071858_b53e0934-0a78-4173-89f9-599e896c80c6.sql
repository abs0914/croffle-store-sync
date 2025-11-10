
-- Fix recipe ingredient mapping for Crushed Oreo
-- Update from outdated inventory item (0 stock) to correct item (65 stock)
UPDATE recipe_ingredients 
SET inventory_stock_id = '940e45e8-b6c1-409f-ad92-1a8b79f35b1c',
    updated_at = now()
WHERE id = '7d458603-f79a-4bb1-9ef0-4d0da78a1c3c';
