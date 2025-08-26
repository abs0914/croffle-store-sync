-- Fix pricing inconsistencies for Mini Croffle and Croffle Overload
UPDATE product_catalog 
SET price = 65.00, updated_at = NOW() 
WHERE product_name = 'Mini Croffle' AND price != 65.00;

UPDATE product_catalog 
SET price = 99.00, updated_at = NOW() 
WHERE product_name = 'Croffle Overload' AND price != 99.00;