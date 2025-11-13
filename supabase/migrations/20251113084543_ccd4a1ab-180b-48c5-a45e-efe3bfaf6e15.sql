
-- Fix Cappuccino Hot price in product_catalog table (POS uses this table)
UPDATE product_catalog
SET price = 75.00, updated_at = NOW()
WHERE product_name = 'Cappuccino Hot'
AND price = 228.00;
