
-- Update Choco Overload Croffle price to ₱125
UPDATE product_catalog 
SET 
  price = 125.00,
  updated_at = now()
WHERE LOWER(product_name) = 'choco overload croffle';
