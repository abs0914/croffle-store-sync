-- Phase 1: Data Consistency Fixes for Product Catalog

-- 1. Fix zero-cost products with proper pricing calculation
UPDATE product_catalog 
SET price = CASE 
  WHEN price = 0 OR price IS NULL THEN
    COALESCE(
      (SELECT r.total_cost * 1.5 FROM recipes r WHERE r.id = product_catalog.recipe_id),
      50.0
    )
  ELSE price
END
WHERE price = 0 OR price IS NULL;

-- 2. Synchronize product_catalog availability with products table
UPDATE product_catalog 
SET is_available = p.is_active
FROM products p 
WHERE p.name = product_catalog.product_name 
  AND p.store_id = product_catalog.store_id
  AND product_catalog.is_available != p.is_active;

-- 3. Update products table to match product_catalog pricing
UPDATE products 
SET price = pc.price
FROM product_catalog pc
WHERE pc.product_name = products.name 
  AND pc.store_id = products.store_id
  AND products.price != pc.price;

-- 4. Clean up orphaned product_catalog entries (no matching recipe)
UPDATE product_catalog 
SET is_available = false
WHERE recipe_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.id = product_catalog.recipe_id
  );

-- 5. Set default categories for uncategorized items
UPDATE product_catalog 
SET category_id = (
  SELECT c.id FROM categories c 
  WHERE c.store_id = product_catalog.store_id 
  AND LOWER(c.name) = 'general'
  LIMIT 1
)
WHERE category_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.store_id = product_catalog.store_id 
    AND LOWER(c.name) = 'general'
  );

-- 6. Create missing products entries for product_catalog items
INSERT INTO products (
  name, description, price, cost, sku, stock_quantity,
  category_id, store_id, is_active, recipe_id, product_type, image_url
)
SELECT DISTINCT
  pc.product_name,
  pc.description,
  pc.price,
  COALESCE(r.total_cost, pc.price * 0.7),
  CONCAT('PC-', UPPER(SUBSTRING(REPLACE(pc.product_name, ' ', ''), 1, 6)), '-', SUBSTRING(pc.store_id::text, 1, 6)),
  100,
  pc.category_id,
  pc.store_id,
  pc.is_available,
  pc.recipe_id,
  CASE WHEN pc.recipe_id IS NOT NULL THEN 'recipe' ELSE 'direct' END,
  pc.image_url
FROM product_catalog pc
LEFT JOIN recipes r ON r.id = pc.recipe_id
WHERE NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = pc.product_name 
  AND p.store_id = pc.store_id
);

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_catalog_store_recipe ON product_catalog(store_id, recipe_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_name_store ON product_catalog(product_name, store_id);
CREATE INDEX IF NOT EXISTS idx_products_name_store ON products(name, store_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_catalog_id ON product_ingredients(product_catalog_id);

-- 8. Create function to validate product catalog consistency
CREATE OR REPLACE FUNCTION validate_product_catalog_consistency()
RETURNS TABLE(
  issue_type text,
  count_affected integer,
  description text
) AS $$
BEGIN
  -- Check for zero-priced items
  RETURN QUERY
  SELECT 
    'zero_price'::text,
    COUNT(*)::integer,
    'Product catalog items with zero or null price'::text
  FROM product_catalog 
  WHERE price = 0 OR price IS NULL;
  
  -- Check for missing recipes
  RETURN QUERY
  SELECT 
    'missing_recipe'::text,
    COUNT(*)::integer,
    'Product catalog items with invalid recipe references'::text
  FROM product_catalog pc
  WHERE pc.recipe_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM recipes r WHERE r.id = pc.recipe_id);
  
  -- Check for sync issues between catalog and products
  RETURN QUERY
  SELECT 
    'sync_mismatch'::text,
    COUNT(*)::integer,
    'Mismatched availability between product_catalog and products'::text
  FROM product_catalog pc
  JOIN products p ON p.name = pc.product_name AND p.store_id = pc.store_id
  WHERE pc.is_available != p.is_active;
  
  -- Check for missing categories
  RETURN QUERY
  SELECT 
    'missing_category'::text,
    COUNT(*)::integer,
    'Product catalog items without category assignment'::text
  FROM product_catalog
  WHERE category_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to sync product catalog with products table
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
    
    -- If no matching product found and it's a valid catalog item, create one
    IF NOT FOUND AND NEW.is_available = true THEN
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

-- Create trigger to automatically sync changes
DROP TRIGGER IF EXISTS sync_product_catalog_trigger ON product_catalog;
CREATE TRIGGER sync_product_catalog_trigger
  AFTER UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_catalog_changes();