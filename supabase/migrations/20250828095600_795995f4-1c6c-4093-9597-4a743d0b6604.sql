-- Phase 2: Complete the sync improvements and image fix
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

-- Force sync all images from catalog to products
DO $$
DECLARE
  total_synced INTEGER := 0;
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
  RAISE NOTICE 'Synced % product images from catalog', total_synced;
END $$;

-- Create new triggers with improved logic
DROP TRIGGER IF EXISTS sync_catalog_to_products_improved_trigger ON product_catalog;
CREATE TRIGGER sync_catalog_to_products_improved_trigger
  AFTER INSERT OR UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION sync_catalog_to_products_improved();

-- Create new smart uniqueness trigger (if it doesn't exist)
DROP TRIGGER IF EXISTS smart_product_uniqueness_trigger ON products;
CREATE TRIGGER smart_product_uniqueness_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION smart_product_uniqueness_check();