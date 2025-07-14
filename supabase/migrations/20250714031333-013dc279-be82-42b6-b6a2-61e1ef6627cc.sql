-- Fix Classic category and categorization issues

-- Step 1: Activate and standardize Classic categories
UPDATE categories 
SET is_active = true, 
    name = 'Classic',
    updated_at = NOW()
WHERE LOWER(name) = 'classic' AND is_active = false;

-- Step 2: Standardize all Classic category names to title case
UPDATE categories 
SET name = 'Classic',
    updated_at = NOW()
WHERE LOWER(name) = 'classic';

-- Step 3: Merge duplicate addon categories - keep "Add-on" (singular)
-- First, update any products assigned to "addon" or "Add-ons" to use "Add-on"
WITH canonical_addon AS (
  SELECT id, store_id 
  FROM categories 
  WHERE name = 'Add-on' AND is_active = true
),
duplicate_addons AS (
  SELECT id, store_id
  FROM categories 
  WHERE name IN ('addon', 'Add-ons', 'Addon') AND is_active = true
)
UPDATE product_catalog 
SET category_id = ca.id
FROM canonical_addon ca, duplicate_addons da
WHERE product_catalog.category_id = da.id 
  AND ca.store_id = da.store_id;

-- Update products table as well
WITH canonical_addon AS (
  SELECT id, store_id 
  FROM categories 
  WHERE name = 'Add-on' AND is_active = true
),
duplicate_addons AS (
  SELECT id, store_id
  FROM categories 
  WHERE name IN ('addon', 'Add-ons', 'Addon') AND is_active = true
)
UPDATE products 
SET category_id = ca.id
FROM canonical_addon ca, duplicate_addons da
WHERE products.category_id = da.id 
  AND ca.store_id = da.store_id;

-- Deactivate duplicate addon categories
UPDATE categories 
SET is_active = false,
    updated_at = NOW()
WHERE name IN ('addon', 'Add-ons', 'Addon') AND is_active = true;

-- Step 4: Create "Add-on" category where it doesn't exist but duplicates do
INSERT INTO categories (name, is_active, store_id)
SELECT DISTINCT 'Add-on', true, store_id
FROM categories 
WHERE name IN ('addon', 'Add-ons', 'Addon') 
  AND store_id NOT IN (
    SELECT store_id 
    FROM categories 
    WHERE name = 'Add-on'
  );

-- Step 5: Remove empty "Other" categories (categories with no products)
UPDATE categories 
SET is_active = false,
    updated_at = NOW()
WHERE name = 'Other' 
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog WHERE category_id = categories.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM products WHERE category_id = categories.id
  );

-- Step 6: Ensure Classic products are properly categorized
-- Update products that should be Classic based on naming patterns
UPDATE product_catalog 
SET category_id = (
  SELECT id FROM categories 
  WHERE store_id = product_catalog.store_id 
    AND name = 'Classic' 
    AND is_active = true
  LIMIT 1
)
WHERE (
  product_name ILIKE '%caramel delight%'
  OR product_name ILIKE '%choco marshmallow%'
  OR product_name ILIKE '%choco nut%'
  OR product_name ILIKE '%tiramisu%'
) AND category_id IS NULL;

-- Sync to products table
UPDATE products 
SET category_id = pc.category_id
FROM product_catalog pc
WHERE products.store_id = pc.store_id 
  AND products.name = pc.product_name
  AND pc.category_id IS NOT NULL;