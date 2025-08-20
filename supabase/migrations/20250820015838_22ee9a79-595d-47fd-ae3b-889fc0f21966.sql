-- Update Croffle Pricing Across All Stores
-- This migration sets the correct prices for specific croffle categories

-- Update Glaze Croffle products to Php 79
UPDATE product_catalog 
SET price = 79.00,
    updated_at = NOW()
WHERE (
    product_name ILIKE '%glaze%croffle%' 
    OR product_name ILIKE 'glaze%'
    OR category_id IN (
        SELECT id FROM categories 
        WHERE LOWER(name) LIKE '%glaze%'
    )
)
AND product_name ILIKE '%croffle%';

-- Update Mini Croffle products to Php 65
UPDATE product_catalog 
SET price = 65.00,
    updated_at = NOW()
WHERE (
    product_name ILIKE 'mini%croffle%'
    OR product_name ILIKE '%mini croffle%'
    OR category_id IN (
        SELECT id FROM categories 
        WHERE LOWER(name) LIKE '%mini%croffle%'
    )
);

-- Update Croffle Overload products to Php 99
UPDATE product_catalog 
SET price = 99.00,
    updated_at = NOW()
WHERE (
    product_name ILIKE '%overload%croffle%'
    OR product_name ILIKE 'croffle overload%'
    OR product_name ILIKE '%choco overload%croffle%'
    OR category_id IN (
        SELECT id FROM categories 
        WHERE LOWER(name) LIKE '%overload%'
    )
);

-- Also update corresponding products table to maintain sync
UPDATE products 
SET price = 79.00,
    updated_at = NOW()
WHERE (
    name ILIKE '%glaze%croffle%' 
    OR name ILIKE 'glaze%'
    OR category_id IN (
        SELECT id FROM categories 
        WHERE LOWER(name) LIKE '%glaze%'
    )
)
AND name ILIKE '%croffle%';

UPDATE products 
SET price = 65.00,
    updated_at = NOW()
WHERE (
    name ILIKE 'mini%croffle%'
    OR name ILIKE '%mini croffle%'
    OR category_id IN (
        SELECT id FROM categories 
        WHERE LOWER(name) LIKE '%mini%croffle%'
    )
);

UPDATE products 
SET price = 99.00,
    updated_at = NOW()
WHERE (
    name ILIKE '%overload%croffle%'
    OR name ILIKE 'croffle overload%'
    OR name ILIKE '%choco overload%croffle%'
    OR category_id IN (
        SELECT id FROM categories 
        WHERE LOWER(name) LIKE '%overload%'
    )
);

-- Ensure all these croffle products are available
UPDATE product_catalog 
SET is_available = true,
    updated_at = NOW()
WHERE (
    product_name ILIKE '%glaze%croffle%' 
    OR product_name ILIKE 'mini%croffle%'
    OR product_name ILIKE '%overload%croffle%'
    OR product_name ILIKE '%mini croffle%'
    OR product_name ILIKE 'croffle overload%'
    OR product_name ILIKE '%choco overload%croffle%'
);

-- Also sync the products table
UPDATE products 
SET is_active = true,
    updated_at = NOW()
WHERE (
    name ILIKE '%glaze%croffle%' 
    OR name ILIKE 'mini%croffle%'
    OR name ILIKE '%overload%croffle%'
    OR name ILIKE '%mini croffle%'
    OR name ILIKE 'croffle overload%'
    OR name ILIKE '%choco overload%croffle%'
);