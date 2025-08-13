-- Update the Glaze Croffle price to 79 for the store that doesn't have it updated yet
UPDATE product_catalog 
SET price = 79.00, updated_at = NOW()
WHERE product_name ILIKE '%glaze%croffle%' 
AND price != 79.00;