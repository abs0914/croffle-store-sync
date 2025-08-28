-- Comprehensive fix for product update failures and image sync issues
-- Phase 1: Fix duplicate product name conflicts

-- Temporarily disable problematic triggers
ALTER TABLE products DISABLE TRIGGER IF EXISTS enhanced_product_uniqueness_trigger;
ALTER TABLE products DISABLE TRIGGER IF EXISTS check_product_uniqueness_trigger;

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

-- Create function to fix duplicate product names by deactivating older duplicates
CREATE OR REPLACE FUNCTION fix_duplicate_products()
RETURNS TABLE(fixed_count INTEGER, details TEXT) AS $$
DECLARE
  duplicate_record RECORD;
  total_fixed INTEGER := 0;
  detail_text TEXT := '';
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
      detail_text := detail_text || 'Deactivated duplicate: ' || duplicate_record.product_names[i] || '; ';
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT total_fixed, detail_text;
END;
$$;

-- Run the fix
SELECT * FROM fix_duplicate_products();

-- Create improved sync function for catalog to products
CREATE OR REPLACE FUNCTION sync_catalog_to_products_improved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public', 'auth'
AS $$
DECLARE
  existing_product_id UUID;
  generated_sku TEXT;
BEGIN
  -- Only sync available catalog items
  IF NEW.is_available = false THEN
    -- If catalog item is disabled, deactivate corresponding product
    UPDATE products 
    SET is_active = false, updated_at = NOW()
    WHERE store_id = NEW.store_id 
    AND TRIM(LOWER(name)) = TRIM(LOWER(NEW.product_name));
    RETURN NEW;
  END IF;

  -- Check if product already exists (case/space insensitive)
  SELECT id INTO existing_product_id
  FROM products 
  WHERE store_id = NEW.store_id 
  AND TRIM(LOWER(name)) = TRIM(LOWER(NEW.product_name))
  AND is_active = true
  LIMIT 1;

  IF existing_product_id IS NOT NULL THEN
    -- Update existing product
    UPDATE products 
    SET 
      price = NEW.price,
      image_url = NEW.image_url,
      category_id = NEW.category_id,
      is_active = true,
      updated_at = NOW()
    WHERE id = existing_product_id;
  ELSE
    -- Generate unique SKU
    generated_sku := UPPER(LEFT(REGEXP_REPLACE(NEW.product_name, '[^A-Za-z0-9]', '', 'g'), 8)) || 
                     EXTRACT(EPOCH FROM NOW())::TEXT;
    
    -- Create new product
    INSERT INTO products (
      name,
      price,
      store_id,
      category_id,
      image_url,
      sku,
      is_active,
      stock_quantity,
      created_at,
      updated_at
    ) VALUES (
      NEW.product_name,
      NEW.price,
      NEW.store_id,
      NEW.category_id,
      NEW.image_url,
      generated_sku,
      true,
      0,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create function to force sync all images from catalog to products
CREATE OR REPLACE FUNCTION force_sync_catalog_images()
RETURNS TABLE(synced_count INTEGER, details TEXT) AS $$
DECLARE
  total_synced INTEGER := 0;
  detail_text TEXT := '';
BEGIN
  -- Update products with catalog images
  UPDATE products 
  SET 
    image_url = pc.image_url,
    updated_at = NOW()
  FROM product_catalog pc
  WHERE products.store_id = pc.store_id
  AND TRIM(LOWER(products.name)) = TRIM(LOWER(pc.product_name))
  AND pc.image_url IS NOT NULL
  AND (products.image_url IS NULL OR products.image_url != pc.image_url);
  
  GET DIAGNOSTICS total_synced = ROW_COUNT;
  detail_text := 'Synced ' || total_synced || ' product images from catalog';
  
  RETURN QUERY SELECT total_synced, detail_text;
END;
$$;

-- Run image sync
SELECT * FROM force_sync_catalog_images();

-- Create new triggers with improved logic
CREATE TRIGGER smart_product_uniqueness_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION smart_product_uniqueness_check();

CREATE TRIGGER sync_catalog_to_products_improved_trigger
  AFTER INSERT OR UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION sync_catalog_to_products_improved();

-- Cleanup old functions
DROP FUNCTION IF EXISTS fix_duplicate_products();
DROP FUNCTION IF EXISTS force_sync_catalog_images();

-- Re-enable any other necessary triggers (but not the problematic ones)
-- The new smart triggers will handle the logic better