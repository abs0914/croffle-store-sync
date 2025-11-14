-- Standardize pricing across all stores in product_catalog
-- This will ensure uniform pricing for POS displays

-- Croffle products (₱125)
UPDATE product_catalog
SET price = 125,
    updated_at = now()
WHERE product_name ILIKE '%croffle%'
  AND product_name NOT ILIKE '%mini%'
  AND product_name NOT ILIKE '%overload%'
  AND product_name NOT ILIKE '%glaze%'
  AND product_name NOT ILIKE '%plain%';

-- Mini Croffle (₱65)
UPDATE product_catalog
SET price = 65,
    updated_at = now()
WHERE product_name ILIKE '%mini%croffle%'
  OR product_name ILIKE '%croffle%mini%';

-- Croffle Overload (₱99)
UPDATE product_catalog
SET price = 99,
    updated_at = now()
WHERE product_name ILIKE '%croffle%overload%'
  OR product_name ILIKE '%overload%croffle%';

-- Glaze Croffle (₱79)
UPDATE product_catalog
SET price = 79,
    updated_at = now()
WHERE product_name ILIKE '%glaze%croffle%'
  OR product_name ILIKE '%croffle%glaze%';

-- Plain Croffle (₱79)
UPDATE product_catalog
SET price = 79,
    updated_at = now()
WHERE product_name ILIKE '%plain%croffle%'
  OR product_name ILIKE '%croffle%plain%';

-- Also update products table to match catalog pricing
UPDATE products
SET price = 125,
    updated_at = now()
WHERE name ILIKE '%croffle%'
  AND name NOT ILIKE '%mini%'
  AND name NOT ILIKE '%overload%'
  AND name NOT ILIKE '%glaze%'
  AND name NOT ILIKE '%plain%';

UPDATE products
SET price = 65,
    updated_at = now()
WHERE name ILIKE '%mini%croffle%'
  OR name ILIKE '%croffle%mini%';

UPDATE products
SET price = 99,
    updated_at = now()
WHERE name ILIKE '%croffle%overload%'
  OR name ILIKE '%overload%croffle%';

UPDATE products
SET price = 79,
    updated_at = now()
WHERE name ILIKE '%glaze%croffle%'
  OR name ILIKE '%croffle%glaze%';

UPDATE products
SET price = 79,
    updated_at = now()
WHERE name ILIKE '%plain%croffle%'
  OR name ILIKE '%croffle%plain%';