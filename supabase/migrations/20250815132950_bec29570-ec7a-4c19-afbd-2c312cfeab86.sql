-- Fix duplicate Tiramisu products - deactivate the one with incorrect ₱6 price
UPDATE products 
SET is_active = false 
WHERE name = 'Tiramisu' 
AND price = 6.00 
AND id = '12ef5de1-b700-45d0-94a5-40fef8cb6a58';