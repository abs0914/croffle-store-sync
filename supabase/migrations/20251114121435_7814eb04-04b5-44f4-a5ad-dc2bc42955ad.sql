
-- Update Coke and Bottled Water prices to standard ₱20 across all stores
UPDATE product_catalog 
SET 
  price = 20.00,
  updated_at = now()
WHERE LOWER(product_name) IN ('coke', 'bottled water');
