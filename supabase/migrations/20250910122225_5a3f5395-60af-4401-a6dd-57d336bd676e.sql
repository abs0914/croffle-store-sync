-- =====================================================
-- PRODUCT DEDUPLICATION - TARGETED CLEANUP MIGRATION
-- =====================================================
-- Purpose: Remove duplicate products by keeping correct pricing and deactivating others
-- Issue: Multiple Mini Croffle and Croffle Overload products per store with different prices

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

-- Step 5: Now add the unique constraint (should work after deduplication)
ALTER TABLE product_catalog 
ADD CONSTRAINT unique_active_product_per_store 
UNIQUE (store_id, product_name) 
WHERE is_available = true;

-- Step 6: Create validation function to prevent duplicate product creation
CREATE OR REPLACE FUNCTION check_product_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.product_name != NEW.product_name OR OLD.store_id != NEW.store_id OR OLD.is_available != NEW.is_available)) THEN
    IF NEW.is_available = true AND EXISTS (
      SELECT 1 FROM product_catalog 
      WHERE product_name = NEW.product_name 
      AND store_id = NEW.store_id 
      AND is_available = true
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Product "%" already exists in this store', NEW.product_name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add trigger to enforce uniqueness
DROP TRIGGER IF EXISTS product_uniqueness_check ON product_catalog;
CREATE TRIGGER product_uniqueness_check
  BEFORE INSERT OR UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION check_product_uniqueness();

COMMIT;