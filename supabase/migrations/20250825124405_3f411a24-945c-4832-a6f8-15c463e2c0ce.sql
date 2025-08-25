-- Data Integrity Repair: Fix sync function to prevent duplicates

-- Step 1: Modify the sync function to be more defensive about duplicates
CREATE OR REPLACE FUNCTION sync_product_catalog_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding products table entry when product_catalog changes
  IF TG_OP = 'UPDATE' THEN
    UPDATE products 
    SET 
      name = NEW.product_name,
      description = NEW.description,
      price = NEW.price,
      image_url = NEW.image_url,
      is_active = NEW.is_available,
      category_id = NEW.category_id,
      updated_at = NOW()
    WHERE store_id = NEW.store_id 
      AND (name = OLD.product_name OR name = NEW.product_name)
      AND (recipe_id = NEW.recipe_id OR (recipe_id IS NULL AND NEW.recipe_id IS NULL));
    
    -- Only create a new product if:
    -- 1. No matching product found in the update
    -- 2. The catalog item is available
    -- 3. No product with this name already exists (CRITICAL CHECK)
    IF NOT FOUND AND NEW.is_available = true AND NOT EXISTS (
      SELECT 1 FROM products 
      WHERE store_id = NEW.store_id 
        AND name = NEW.product_name 
        AND is_active = true
    ) THEN
      INSERT INTO products (
        name, description, price, cost, sku, stock_quantity,
        category_id, store_id, is_active, recipe_id, product_type, image_url
      ) VALUES (
        NEW.product_name,
        NEW.description,
        NEW.price,
        NEW.price * 0.7,
        CONCAT('PC-', UPPER(SUBSTRING(REPLACE(NEW.product_name, ' ', ''), 1, 6)), '-', SUBSTRING(NEW.store_id::text, 1, 6)),
        100,
        NEW.category_id,
        NEW.store_id,
        NEW.is_available,
        NEW.recipe_id,
        CASE WHEN NEW.recipe_id IS NOT NULL THEN 'recipe' ELSE 'direct' END,
        NEW.image_url
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 2: Now perform the data repair
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name))
  AND r.is_active = true
  AND product_catalog.is_available = true;