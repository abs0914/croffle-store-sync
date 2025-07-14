-- Move Mini Croffle and Croffle Overload products to Combo category
-- and rename Other category to Add-ons

-- Step 1: Get the Combo category ID for each store
WITH combo_categories AS (
  SELECT id, store_id 
  FROM categories 
  WHERE LOWER(name) = 'combo' AND is_active = true
)
-- Update Mini Croffle and Croffle Overload products to Combo category
UPDATE product_catalog 
SET category_id = cc.id,
    updated_at = NOW()
FROM combo_categories cc
WHERE product_catalog.store_id = cc.store_id 
  AND (
    LOWER(product_catalog.product_name) LIKE '%mini croffle%'
    OR LOWER(product_catalog.product_name) LIKE '%croffle overload%'
  );

-- Step 2: Sync the changes to products table
WITH combo_categories AS (
  SELECT id, store_id 
  FROM categories 
  WHERE LOWER(name) = 'combo' AND is_active = true
)
UPDATE products 
SET category_id = cc.id,
    updated_at = NOW()
FROM combo_categories cc
WHERE products.store_id = cc.store_id 
  AND (
    LOWER(products.name) LIKE '%mini croffle%'
    OR LOWER(products.name) LIKE '%croffle overload%'
  );

-- Step 3: Rename "Other" category to "Add-ons"
UPDATE categories 
SET name = 'Add-ons',
    updated_at = NOW()
WHERE LOWER(name) = 'other' AND is_active = true;

-- Step 4: Verify the changes
SELECT 
  'Product categorization check' as check_type,
  pc.product_name,
  c.name as category_name,
  s.name as store_name
FROM product_catalog pc
JOIN categories c ON pc.category_id = c.id
JOIN stores s ON pc.store_id = s.id
WHERE (
  LOWER(pc.product_name) LIKE '%mini croffle%'
  OR LOWER(pc.product_name) LIKE '%croffle overload%'
)
ORDER BY s.name, pc.product_name;