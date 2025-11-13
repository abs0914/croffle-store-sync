
-- Fix Cappuccino Hot price back to 75.00 for stores that have the incorrect 228.00 price
UPDATE products
SET price = 75.00, updated_at = NOW()
WHERE name = 'Cappuccino Hot' 
AND price = 228.00;
