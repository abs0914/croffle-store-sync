-- Comprehensive cleanup of Mini Croffle and Croffle Overload duplicates across all stores
-- This fixes the "Product not found" error by removing incorrect entries

-- First, let's see what we're dealing with
CREATE TEMP TABLE duplicate_analysis AS
SELECT 
  name,
  store_id,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY 
    CASE 
      WHEN name = 'Mini Croffle' AND price = 65.00 THEN 1
      WHEN name = 'Croffle Overload' AND price = 99.00 THEN 1  
      WHEN name = 'Croffle Overload' AND price = 125.00 THEN 2
      ELSE 999
    END
  ) as product_ids,
  ARRAY_AGG(price ORDER BY 
    CASE 
      WHEN name = 'Mini Croffle' AND price = 65.00 THEN 1
      WHEN name = 'Croffle Overload' AND price = 99.00 THEN 1
      WHEN name = 'Croffle Overload' AND price = 125.00 THEN 2  
      ELSE 999
    END
  ) as prices
FROM products 
WHERE name ILIKE '%mini%croffle%' OR name ILIKE '%croffle%overload%'
GROUP BY name, store_id
HAVING COUNT(*) > 1;

-- Delete all incorrect Mini Croffle entries (not ₱65.00)
DELETE FROM products 
WHERE name = 'Mini Croffle' 
  AND price != 65.00;

-- Delete all incorrect Croffle Overload entries (not ₱99.00 or ₱125.00)
DELETE FROM products 
WHERE name ILIKE '%croffle%overload%' 
  AND price NOT IN (99.00, 125.00);

-- For stores with multiple correct Croffle Overload prices, keep the ₱99.00 version
DELETE FROM products 
WHERE id IN (
  SELECT p1.id 
  FROM products p1
  JOIN products p2 ON p1.store_id = p2.store_id 
    AND p1.name ILIKE '%croffle%overload%' 
    AND p2.name ILIKE '%croffle%overload%'
    AND p1.price = 125.00 
    AND p2.price = 99.00
    AND p1.id != p2.id
);

-- Ensure product_catalog has correct pricing
UPDATE product_catalog 
SET price = 65.00 
WHERE product_name = 'Mini Croffle' AND price != 65.00;

UPDATE product_catalog 
SET price = 99.00 
WHERE (product_name ILIKE '%croffle%overload%' OR product_name = 'Croffle Overload')
  AND price != 99.00;

-- Add unique constraint to prevent future duplicates (store_id + name combination)
ALTER TABLE products 
ADD CONSTRAINT products_store_name_unique 
UNIQUE (store_id, name);

-- Create function to sync product_catalog changes to products table
CREATE OR REPLACE FUNCTION sync_product_catalog_to_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding products table entry
  UPDATE products 
  SET 
    name = NEW.product_name,
    description = NEW.description,
    price = NEW.price,
    image_url = NEW.image_url,
    is_active = NEW.is_available,
    category_id = NEW.category_id,
    updated_at = NOW()
  WHERE store_id = NEW.store_id 
    AND name = OLD.product_name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync product_catalog changes
DROP TRIGGER IF EXISTS sync_catalog_to_products ON product_catalog;
CREATE TRIGGER sync_catalog_to_products
  AFTER UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_catalog_to_products();

-- Verification: Show final state
SELECT 
  s.name as store_name,
  p.name as product_name, 
  p.price,
  p.id,
  COUNT(*) OVER (PARTITION BY p.store_id, p.name) as count_per_store
FROM products p
JOIN stores s ON p.store_id = s.id  
WHERE p.name ILIKE '%mini%croffle%' OR p.name ILIKE '%croffle%overload%'
ORDER BY s.name, p.name;