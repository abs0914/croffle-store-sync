-- Make Café Latte products available in the POS system
UPDATE product_catalog 
SET is_available = true, 
    product_status = 'available',
    updated_at = now()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND product_name IN ('Café Latte (Hot)', 'Café Latte (Iced)');