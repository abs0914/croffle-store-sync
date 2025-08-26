-- Step 1: Clean up duplicates systematically before adding constraints
-- Handle the "Product not found" error by removing all incorrect product entries

-- First, remove all Mini Croffle entries with incorrect pricing (keep only ₱65.00)
DELETE FROM products 
WHERE name = 'Mini Croffle' 
  AND price != 65.00;

-- Remove all Croffle Overload entries with incorrect pricing (keep only ₱99.00)  
DELETE FROM products 
WHERE name ILIKE '%croffle%overload%' 
  AND price NOT IN (99.00);

-- Handle remaining duplicates by keeping only the first (oldest) correct entry per store
DELETE FROM products p1
WHERE p1.name IN ('Mini Croffle', 'Croffle Overload')
  AND EXISTS (
    SELECT 1 FROM products p2 
    WHERE p2.store_id = p1.store_id 
      AND p2.name = p1.name
      AND p2.created_at < p1.created_at
  );

-- Clean up any other problematic duplicates (like Cafe Mocha Iced mentioned in error)
DELETE FROM products p1
WHERE EXISTS (
    SELECT 1 FROM products p2 
    WHERE p2.store_id = p1.store_id 
      AND p2.name = p1.name
      AND p2.created_at < p1.created_at
  );

-- Ensure product_catalog has correct pricing
UPDATE product_catalog 
SET price = 65.00 
WHERE product_name = 'Mini Croffle' AND price != 65.00;

UPDATE product_catalog 
SET price = 99.00 
WHERE (product_name ILIKE '%croffle%overload%' OR product_name = 'Croffle Overload')
  AND price != 99.00;

-- Verification: Check final state
SELECT 
  s.name as store_name,
  p.name as product_name, 
  p.price,
  p.id
FROM products p
JOIN stores s ON p.store_id = s.id  
WHERE p.name ILIKE '%mini%croffle%' OR p.name ILIKE '%croffle%overload%'
ORDER BY s.name, p.name;