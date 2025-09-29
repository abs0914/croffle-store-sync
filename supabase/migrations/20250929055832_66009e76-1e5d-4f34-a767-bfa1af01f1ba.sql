-- Update Dark Chocolate Croffle price to match product catalog (₱125)
UPDATE product_catalog 
SET price = 125.00, updated_at = NOW()
WHERE product_name ILIKE '%dark chocolate croffle%';