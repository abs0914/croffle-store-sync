-- Fix Mini Croffle category assignment for Mix & Match display
-- Move all Mini Croffle products from separate Mini Croffle categories to Mix & Match categories

-- Update all Mini Croffle products to use the Mix & Match category for their store
UPDATE product_catalog pc
SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.store_id = pc.store_id 
    AND LOWER(TRIM(c.name)) = 'mix & match'
  LIMIT 1
),
updated_at = NOW()
WHERE pc.id IN (
  SELECT pc2.id
  FROM product_catalog pc2
  JOIN categories c ON pc2.category_id = c.id
  WHERE LOWER(TRIM(pc2.product_name)) LIKE '%mini%croffle%'
    AND LOWER(TRIM(c.name)) = 'mini croffle'
);

-- Log the category changes
INSERT INTO cleanup_log (
  table_name,
  action,
  old_id,
  new_id,
  details,
  created_at
)
SELECT 
  'product_catalog' as table_name,
  'category_reassignment' as action,
  old_cat.id as old_id,
  new_cat.id as new_id,
  jsonb_build_object(
    'product_id', pc.id,
    'product_name', pc.product_name,
    'store_name', s.name,
    'old_category', old_cat.name,
    'new_category', new_cat.name,
    'reason', 'Move Mini Croffle products to Mix & Match category for proper POS display'
  ) as details,
  NOW()
FROM product_catalog pc
JOIN stores s ON pc.store_id = s.id
JOIN categories new_cat ON pc.category_id = new_cat.id AND LOWER(TRIM(new_cat.name)) = 'mix & match'
JOIN categories old_cat ON old_cat.store_id = s.id AND LOWER(TRIM(old_cat.name)) = 'mini croffle'
WHERE LOWER(TRIM(pc.product_name)) LIKE '%mini%croffle%';

-- Verify the changes
SELECT 
  pc.id,
  pc.product_name,
  s.name as store_name,
  c.name as category_name,
  'MOVED_TO_MIX_MATCH' as status
FROM product_catalog pc
JOIN stores s ON pc.store_id = s.id  
JOIN categories c ON pc.category_id = c.id
WHERE LOWER(TRIM(pc.product_name)) LIKE '%mini%croffle%'
  AND LOWER(TRIM(c.name)) = 'mix & match'
ORDER BY s.name, pc.product_name;