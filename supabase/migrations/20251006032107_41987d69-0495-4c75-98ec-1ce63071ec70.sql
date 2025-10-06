-- Update packaging items to have zero price (they're free but tracked for inventory)
UPDATE products 
SET price = 0.00, updated_at = now()
WHERE name IN ('Mini Take Out Box', 'Paper Bag 06', 'Paper Bag 20')
AND price > 0;