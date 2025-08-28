-- Comprehensive fix for product update failures and image sync issues
-- Phase 1: Fix duplicate product name conflicts

-- Check and disable problematic triggers if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enhanced_product_uniqueness_trigger') THEN
    ALTER TABLE products DISABLE TRIGGER enhanced_product_uniqueness_trigger;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_product_uniqueness_trigger') THEN
    ALTER TABLE products DISABLE TRIGGER check_product_uniqueness_trigger;
  END IF;
END $$;

-- Create improved product uniqueness function that handles trimmed/case variations
CREATE OR REPLACE FUNCTION smart_product_uniqueness_check()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public', 'auth'
AS $$
BEGIN
  -- Only check active products
  IF NEW.is_active = true THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.name != NEW.name OR OLD.store_id != NEW.store_id OR OLD.is_active != NEW.is_active)) THEN
      IF EXISTS (
        SELECT 1 FROM products 
        WHERE TRIM(LOWER(name)) = TRIM(LOWER(NEW.name))
        AND store_id = NEW.store_id 
        AND id != NEW.id
        AND is_active = true
      ) THEN
        RAISE EXCEPTION 'Active product "%" already exists in this store (case/space insensitive)', NEW.name;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix duplicate products by deactivating older duplicates
DO $$
DECLARE
  duplicate_record RECORD;
  total_fixed INTEGER := 0;
BEGIN
  -- Find and fix duplicate active products
  FOR duplicate_record IN 
    SELECT 
      store_id,
      TRIM(LOWER(name)) as normalized_name,
      array_agg(id ORDER BY created_at) as product_ids,
      array_agg(name ORDER BY created_at) as product_names
    FROM products 
    WHERE is_active = true
    GROUP BY store_id, TRIM(LOWER(name))
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first product, deactivate the rest
    FOR i IN 2..array_length(duplicate_record.product_ids, 1) LOOP
      UPDATE products 
      SET is_active = false, 
          updated_at = NOW(),
          name = name || ' (deactivated duplicate)'
      WHERE id = duplicate_record.product_ids[i];
      
      total_fixed := total_fixed + 1;
      RAISE NOTICE 'Deactivated duplicate: %', duplicate_record.product_names[i];
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Fixed % duplicate products', total_fixed;
END $$;