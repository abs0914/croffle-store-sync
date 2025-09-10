-- =====================================================
-- PRODUCT DEDUPLICATION AND CATEGORY CLEANUP MIGRATION
-- =====================================================
-- Purpose: Fix duplicate products in Mix & Match and establish proper categories
-- Issues: Croffle Overload and Mini Croffle have duplicates with wrong pricing/recipes
-- Solution: Deactivate legacy products, fix pricing, create proper categories

BEGIN;

-- Step 1: Create proper categories if they don't exist
INSERT INTO categories (id, name, store_id, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'Mini Croffle',
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.name = 'Mini Croffle' AND c.store_id = s.id
);

INSERT INTO categories (id, name, store_id, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'Premium',
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.name = 'Premium' AND c.store_id = s.id
);

-- Step 2: Deactivate legacy products without recipes (these are the problematic duplicates)
UPDATE product_catalog 
SET is_available = false, updated_at = NOW()
WHERE (
  LOWER(product_name) LIKE '%croffle overload%' OR 
  LOWER(product_name) LIKE '%mini croffle%'
) 
AND recipe_id IS NULL;

-- Step 3: Update pricing for recipe-linked products to correct values
-- Croffle Overload should be ₱99
UPDATE product_catalog 
SET price = 99.00, updated_at = NOW()
WHERE LOWER(product_name) LIKE '%croffle overload%' 
  AND recipe_id IS NOT NULL 
  AND price = 0.00;

-- Mini Croffle should be ₱65  
UPDATE product_catalog 
SET price = 65.00, updated_at = NOW()
WHERE LOWER(product_name) LIKE '%mini croffle%' 
  AND recipe_id IS NOT NULL 
  AND price = 0.00;

-- Step 4: Move products to proper categories
-- Move Mini Croffle products to "Mini Croffle" category
UPDATE product_catalog pc
SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE LOWER(pc.product_name) LIKE '%mini croffle%'
  AND c.name = 'Mini Croffle'
  AND c.store_id = pc.store_id
  AND pc.recipe_id IS NOT NULL
  AND pc.is_available = true;

-- Move Croffle Overload products to "Premium" category  
UPDATE product_catalog pc
SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE LOWER(pc.product_name) LIKE '%croffle overload%'
  AND c.name = 'Premium'
  AND c.store_id = pc.store_id
  AND pc.recipe_id IS NOT NULL
  AND pc.is_available = true;

-- Step 5: Add unique constraint to prevent future duplicates per store
ALTER TABLE product_catalog 
ADD CONSTRAINT unique_active_product_per_store 
UNIQUE (store_id, product_name) 
DEFERRABLE INITIALLY DEFERRED;

-- Step 6: Create audit log for this cleanup
INSERT INTO cleanup_log (table_name, action, details, created_at)
VALUES (
  'product_catalog',
  'deduplication_cleanup', 
  jsonb_build_object(
    'description', 'Fixed duplicate Croffle Overload and Mini Croffle products',
    'actions', jsonb_build_array(
      'Deactivated legacy products without recipes',
      'Updated pricing for recipe-linked products',
      'Moved products to proper categories',
      'Added unique constraint to prevent duplicates'
    )
  ),
  NOW()
);

COMMIT;