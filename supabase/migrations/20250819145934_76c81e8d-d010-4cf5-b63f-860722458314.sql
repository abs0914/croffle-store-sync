-- Fix Mini Croffle and Croffle Overload prices
-- Mini Croffle should be ₱65, Croffle Overload should be ₱99

UPDATE product_catalog 
SET price = 65.00 
WHERE product_name = 'Mini Croffle';

UPDATE product_catalog 
SET price = 99.00 
WHERE product_name ILIKE '%croffle%overload%' 
   OR product_name = 'Croffle Overload';

-- Verify the updates
-- Mini Croffle entries should now show ₱65
-- Croffle Overload entries should now show ₱99