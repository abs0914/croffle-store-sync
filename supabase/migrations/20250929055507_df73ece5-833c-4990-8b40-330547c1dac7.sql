-- Clean up duplicate cappuccino entries and set correct prices
-- Delete duplicates keeping the latest entries with correct prices
DELETE FROM product_catalog 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY product_name, store_id ORDER BY updated_at DESC) as rn
    FROM product_catalog 
    WHERE product_name ILIKE '%cappuccino%'
  ) t 
  WHERE rn > 1
);

-- Update remaining cappuccino entries to correct prices
UPDATE product_catalog 
SET price = 80.00
WHERE product_name ILIKE '%cappuccino%iced%';

UPDATE product_catalog 
SET price = 70.00 
WHERE product_name ILIKE '%cappuccino%' AND product_name NOT ILIKE '%iced%';