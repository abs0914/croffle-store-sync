-- =====================================================
-- PRODUCT DEDUPLICATION - SIMPLIFIED CLEANUP MIGRATION
-- =====================================================

BEGIN;

-- Step 1: Deactivate ₱0 Mini Croffle products (keep ₱65 ones)
UPDATE product_catalog 
SET is_available = false, updated_at = NOW()
WHERE LOWER(product_name) LIKE '%mini croffle%' 
  AND price = 0.00;

-- Step 2: Deactivate ₱0 Croffle Overload products (keep ₱99 ones) 
UPDATE product_catalog 
SET is_available = false, updated_at = NOW()
WHERE LOWER(product_name) LIKE '%croffle overload%' 
  AND price = 0.00;

-- Step 3: Move Mini Croffle products to "Mini Croffle" category
UPDATE product_catalog pc
SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE LOWER(pc.product_name) LIKE '%mini croffle%'
  AND c.name = 'Mini Croffle'
  AND c.store_id = pc.store_id
  AND pc.is_available = true;

-- Step 4: Move Croffle Overload products to "Premium" category  
UPDATE product_catalog pc
SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE LOWER(pc.product_name) LIKE '%croffle overload%'
  AND c.name = 'Premium'
  AND c.store_id = pc.store_id
  AND pc.is_available = true;

-- Step 5: Create partial unique index for active products only
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_product_per_store 
ON product_catalog (store_id, product_name) 
WHERE is_available = true;

-- Step 6: Add audit log
INSERT INTO cleanup_log (table_name, action, details, created_at)
VALUES (
  'product_catalog',
  'deduplication_complete', 
  jsonb_build_object(
    'description', 'Successfully fixed duplicate Croffle Overload and Mini Croffle products',
    'actions_completed', jsonb_build_array(
      'Deactivated ₱0 priced duplicates',
      'Moved products to proper categories', 
      'Added unique constraint for active products'
    )
  ),
  NOW()
);

COMMIT;