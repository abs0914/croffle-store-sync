-- Fix the sync function to handle duplicates properly
CREATE OR REPLACE FUNCTION sync_catalog_to_products_improved()
RETURNS TRIGGER AS $$
DECLARE
    generated_sku TEXT;
    existing_product_id UUID;
BEGIN
  -- Generate SKU for new products
  generated_sku := UPPER(LEFT(NEW.product_name, 8)) || EXTRACT(EPOCH FROM NOW());
  
  IF TG_OP = 'INSERT' THEN
    -- Check if product already exists to avoid duplicates
    SELECT id INTO existing_product_id
    FROM products 
    WHERE store_id = NEW.store_id 
    AND name = NEW.product_name;
    
    IF existing_product_id IS NULL THEN
      -- Create new product only if it doesn't exist
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
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update existing products
    UPDATE products SET
      name = NEW.product_name,
      price = NEW.price,
      category_id = NEW.category_id,
      image_url = NEW.image_url,
      is_active = NEW.is_available,
      updated_at = NOW()
    WHERE store_id = NEW.store_id 
    AND name = OLD.product_name;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Deactivate products when catalog items are deleted
    UPDATE products SET
      is_active = false,
      updated_at = NOW()
    WHERE store_id = OLD.store_id 
    AND name = OLD.product_name;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now safely update image URLs from storage
UPDATE product_catalog 
SET image_url = CASE 
  WHEN EXISTS (
    SELECT 1 FROM storage.objects so 
    WHERE so.bucket_id = 'product-images' 
    AND so.name LIKE 'products/%'
    LIMIT 1
  ) THEN (
    SELECT 'https://bwmkqscqkfoezcuzgpwq.supabase.co/storage/v1/object/public/product-images/' || so.name
    FROM storage.objects so
    WHERE so.bucket_id = 'product-images'
    AND so.name LIKE 'products/%'
    LIMIT 1
  )
  ELSE image_url
END,
updated_at = NOW()
WHERE store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
AND image_url IS NULL;