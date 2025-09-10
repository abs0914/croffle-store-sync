-- Activate and set proper pricing for Croffle Overload in Mix & Match
UPDATE product_catalog 
SET 
    is_available = true,
    price = 95.00, -- Standard price for Croffle Overload
    updated_at = NOW()
WHERE product_name = 'Croffle Overload' 
  AND category_id IN (
    SELECT c.id FROM categories c WHERE c.name = 'Mix & Match'
  );