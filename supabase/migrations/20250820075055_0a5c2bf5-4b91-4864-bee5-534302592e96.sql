-- Clean up Strawberry Latte duplicates
-- Phase 1: Delete duplicate products from products table

-- Delete "Strawberry Latte (Iced)" variants at ₱130
DELETE FROM products 
WHERE LOWER(name) = 'strawberry latte (iced)' 
AND price = 130.00;

-- Delete "STRAWBERRY LATTE (Iced)" variants at ₱99.75
DELETE FROM products 
WHERE LOWER(name) = 'strawberry latte (iced)' 
AND price = 99.75;

-- Delete "STRAWBERRY LATTE (Iced)" variants at ₱108.50 (special case)
DELETE FROM products 
WHERE LOWER(name) = 'strawberry latte (iced)' 
AND price = 108.50;

-- Phase 2: Clean up product_catalog duplicates

-- Delete "Strawberry Latte (Iced)" variants at ₱130 from product_catalog
DELETE FROM product_catalog 
WHERE LOWER(product_name) = 'strawberry latte (iced)' 
AND price = 130.00;

-- Phase 3: Update remaining "Strawberry Latte" products to correct category
-- First get the Cold category IDs for each store and update products table
UPDATE products 
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.store_id = products.store_id 
  AND LOWER(c.name) = 'cold'
  LIMIT 1
)
WHERE LOWER(name) = 'strawberry latte' 
AND price = 99.00;

-- Phase 4: Update product_catalog entries to have correct Cold category
UPDATE product_catalog 
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.store_id = product_catalog.store_id 
  AND LOWER(c.name) = 'cold'
  LIMIT 1
)
WHERE LOWER(product_name) = 'strawberry latte' 
AND price = 99.00 
AND category_id IS NULL;

-- Phase 5: Reactivate any inactive "Strawberry Latte" entries at ₱99
UPDATE products 
SET is_active = true 
WHERE LOWER(name) = 'strawberry latte' 
AND price = 99.00 
AND is_active = false;

UPDATE product_catalog 
SET is_available = true 
WHERE LOWER(product_name) = 'strawberry latte' 
AND price = 99.00 
AND is_available = false;