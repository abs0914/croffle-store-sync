-- Fix database categorization issues with simpler approach
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

-- Update any packaging items that shouldn't be in croffle categories
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