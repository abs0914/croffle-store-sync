-- Fix database categorization issues
-- First, identify and remove "Biscoff Crushed" from incorrect categories
-- Step 1: Check if "Biscoff Crushed" exists in wrong categories
WITH product_issues AS (
  SELECT p.id, p.name, p.category_id, c.name as category_name
  FROM products p
  JOIN categories c ON p.category_id = c.id
  WHERE p.name ILIKE '%biscoff%crushed%' 
    AND c.name IN ('Premium', 'Classic', 'Glaze', 'Fruity', 'Mini Croffle')
)
-- Update misplaced "Biscoff Crushed" products to correct Add-on category
UPDATE products 
SET category_id = (
  SELECT id FROM categories 
  WHERE name = 'Add-ons' 
  AND store_id = products.store_id 
  LIMIT 1
)
WHERE name ILIKE '%biscoff%crushed%' 
  AND category_id IN (
    SELECT id FROM categories 
    WHERE name IN ('Premium', 'Classic', 'Glaze', 'Fruity', 'Mini Croffle')
  );

-- Update any remaining packaging items that shouldn't be in croffle categories
UPDATE products 
SET category_id = (
  SELECT id FROM categories 
  WHERE name = 'Add-ons' 
  AND store_id = products.store_id 
  LIMIT 1
)
WHERE (
  name ILIKE '%take%out%box%' 
  OR name ILIKE '%packaging%'
  OR name ILIKE '%container%'
  OR name ILIKE '%bag%'
) 
AND category_id IN (
  SELECT id FROM categories 
  WHERE name IN ('Premium', 'Classic', 'Glaze', 'Fruity', 'Mini Croffle')
);

-- Log the changes for tracking
INSERT INTO inventory_transactions (
  store_id, 
  transaction_type, 
  quantity, 
  notes,
  created_at
)
SELECT DISTINCT
  p.store_id,
  'category_fix',
  1,
  'Fixed categorization: Moved ' || p.name || ' from croffle category to Add-ons',
  NOW()
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE (p.name ILIKE '%biscoff%crushed%' OR p.name ILIKE '%take%out%box%')
  AND c.name = 'Add-ons';