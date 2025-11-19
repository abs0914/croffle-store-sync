
-- Fix Oreo Strawberry Blended price (should be 110.00, not 276.00)
UPDATE product_catalog
SET price = 110.00,
    updated_at = NOW()
WHERE product_name = 'Oreo Strawberry Blended'
AND store_id = 'c3bfe728-1550-4f4d-af04-12899f3b276b'
AND price = 276.00;
