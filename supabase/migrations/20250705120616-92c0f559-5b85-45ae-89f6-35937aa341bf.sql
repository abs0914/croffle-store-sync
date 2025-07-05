-- Add Beverages category to all stores that don't have it
INSERT INTO categories (name, description, store_id, is_active)
SELECT 
    'Beverages',
    'Drinks and beverages',
    s.id,
    true
FROM stores s
WHERE NOT EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.store_id = s.id 
    AND c.name = 'Beverages'
);