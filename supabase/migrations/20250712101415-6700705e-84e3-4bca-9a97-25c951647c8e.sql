-- Fix infinite recursion in sync triggers by adding change detection

-- Drop existing problematic triggers
DROP TRIGGER IF EXISTS sync_catalog_to_products_trigger ON product_catalog;
DROP TRIGGER IF EXISTS sync_products_to_catalog_trigger ON products;

-- Updated function to sync product_catalog changes to products table (with recursion prevention)
CREATE OR REPLACE FUNCTION sync_product_catalog_to_products()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id UUID;
  changes_needed BOOLEAN := FALSE;
BEGIN
  -- Only proceed if we have a recipe_id
  IF NEW.recipe_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if corresponding products table entry exists and needs updating
  SELECT id INTO target_product_id
  FROM products 
  WHERE store_id = NEW.store_id 
    AND recipe_id = NEW.recipe_id;

  IF target_product_id IS NOT NULL THEN
    -- Check if any meaningful changes are needed (prevent unnecessary updates)
    SELECT EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = target_product_id
        AND (
          p.name IS DISTINCT FROM NEW.product_name OR
          p.description IS DISTINCT FROM NEW.description OR
          ABS(COALESCE(p.price, 0) - COALESCE(NEW.price, 0)) > 0.01 OR
          p.image_url IS DISTINCT FROM NEW.image_url OR
          p.is_active IS DISTINCT FROM NEW.is_available OR
          p.category_id IS DISTINCT FROM NEW.category_id
        )
    ) INTO changes_needed;

    -- Only update if changes are actually needed
    IF changes_needed THEN
      UPDATE products 
      SET 
        name = NEW.product_name,
        description = NEW.description,
        price = NEW.price,
        image_url = NEW.image_url,
        is_active = NEW.is_available,
        category_id = NEW.category_id,
        updated_at = NOW()
      WHERE id = target_product_id;
    END IF;
  ELSE
    -- Create new product if it doesn't exist
    INSERT INTO products (
      name, description, price, cost, sku, stock_quantity,
      category_id, store_id, is_active, recipe_id, product_type, image_url
    )
    SELECT 
      NEW.product_name,
      NEW.description,
      NEW.price,
      COALESCE(r.total_cost, NEW.price * 0.6),
      generate_recipe_sku(NEW.product_name, 'recipe'),
      100,
      NEW.category_id,
      NEW.store_id,
      NEW.is_available,
      NEW.recipe_id,
      'recipe',
      NEW.image_url
    FROM recipes r WHERE r.id = NEW.recipe_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated function to sync products table changes back to product_catalog (with recursion prevention)
CREATE OR REPLACE FUNCTION sync_products_to_product_catalog()
RETURNS TRIGGER AS $$
DECLARE
  target_catalog_id UUID;
  changes_needed BOOLEAN := FALSE;
BEGIN
  -- Only proceed if we have a recipe_id
  IF NEW.recipe_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if corresponding product_catalog entry exists and needs updating
  SELECT id INTO target_catalog_id
  FROM product_catalog 
  WHERE store_id = NEW.store_id 
    AND recipe_id = NEW.recipe_id;

  IF target_catalog_id IS NOT NULL THEN
    -- Check if any meaningful changes are needed (prevent unnecessary updates)
    SELECT EXISTS (
      SELECT 1 FROM product_catalog pc
      WHERE pc.id = target_catalog_id
        AND (
          pc.product_name IS DISTINCT FROM NEW.name OR
          pc.description IS DISTINCT FROM NEW.description OR
          ABS(COALESCE(pc.price, 0) - COALESCE(NEW.price, 0)) > 0.01 OR
          pc.image_url IS DISTINCT FROM NEW.image_url OR
          pc.is_available IS DISTINCT FROM NEW.is_active OR
          pc.category_id IS DISTINCT FROM NEW.category_id
        )
    ) INTO changes_needed;

    -- Only update if changes are actually needed
    IF changes_needed THEN
      UPDATE product_catalog 
      SET 
        product_name = NEW.name,
        description = NEW.description,
        price = NEW.price,
        image_url = NEW.image_url,
        is_available = NEW.is_active,
        category_id = NEW.category_id,
        updated_at = NOW()
      WHERE id = target_catalog_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with recursion prevention
CREATE TRIGGER sync_catalog_to_products_trigger
  AFTER UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_catalog_to_products();

CREATE TRIGGER sync_products_to_catalog_trigger
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (NEW.recipe_id IS NOT NULL)
  EXECUTE FUNCTION sync_products_to_product_catalog();