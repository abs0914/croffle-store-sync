-- Create triggers for automatic synchronization between recipes, product_catalog, and products

-- Function to sync recipe changes to product_catalog
CREATE OR REPLACE FUNCTION sync_recipe_to_product_catalog()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product_catalog entries linked to this recipe
  UPDATE product_catalog 
  SET 
    price = CASE 
      WHEN NEW.suggested_price IS NOT NULL AND NEW.suggested_price > 0 
      THEN NEW.suggested_price 
      ELSE COALESCE(NEW.total_cost * 1.5, price)
    END,
    updated_at = NOW()
  WHERE recipe_id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync product_catalog changes to products table
CREATE OR REPLACE FUNCTION sync_product_catalog_to_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding products table entry
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
    AND recipe_id = NEW.recipe_id;
  
  -- If no product exists, create one
  IF NOT FOUND AND NEW.recipe_id IS NOT NULL THEN
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

-- Function to sync products table changes back to product_catalog
CREATE OR REPLACE FUNCTION sync_products_to_product_catalog()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding product_catalog entry
  UPDATE product_catalog 
  SET 
    product_name = NEW.name,
    description = NEW.description,
    price = NEW.price,
    image_url = NEW.image_url,
    is_available = NEW.is_active,
    category_id = NEW.category_id,
    updated_at = NOW()
  WHERE store_id = NEW.store_id 
    AND recipe_id = NEW.recipe_id
    AND recipe_id IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update product availability based on recipe ingredients
CREATE OR REPLACE FUNCTION update_product_availability()
RETURNS TRIGGER AS $$
DECLARE
  recipe_record RECORD;
  ingredient_available BOOLEAN := TRUE;
BEGIN
  -- Check all recipes that use this inventory item
  FOR recipe_record IN 
    SELECT DISTINCT r.id, r.store_id
    FROM recipes r
    JOIN recipe_ingredients ri ON r.id = ri.recipe_id
    WHERE ri.inventory_stock_id = NEW.id
  LOOP
    -- Check if all ingredients are available for this recipe
    SELECT NOT EXISTS (
      SELECT 1 
      FROM recipe_ingredients ri2
      JOIN inventory_stock ist ON ri2.inventory_stock_id = ist.id
      WHERE ri2.recipe_id = recipe_record.id
        AND ist.stock_quantity < ri2.quantity
    ) INTO ingredient_available;
    
    -- Update product_catalog availability
    UPDATE product_catalog 
    SET 
      is_available = ingredient_available,
      updated_at = NOW()
    WHERE recipe_id = recipe_record.id 
      AND store_id = recipe_record.store_id;
    
    -- Update products table availability
    UPDATE products 
    SET 
      is_active = ingredient_available,
      updated_at = NOW()
    WHERE recipe_id = recipe_record.id 
      AND store_id = recipe_record.store_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS sync_recipe_to_catalog_trigger ON recipes;
CREATE TRIGGER sync_recipe_to_catalog_trigger
  AFTER UPDATE ON recipes
  FOR EACH ROW
  WHEN (OLD.total_cost IS DISTINCT FROM NEW.total_cost OR OLD.suggested_price IS DISTINCT FROM NEW.suggested_price)
  EXECUTE FUNCTION sync_recipe_to_product_catalog();

DROP TRIGGER IF EXISTS sync_catalog_to_products_trigger ON product_catalog;
CREATE TRIGGER sync_catalog_to_products_trigger
  AFTER UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_catalog_to_products();

DROP TRIGGER IF EXISTS sync_products_to_catalog_trigger ON products;
CREATE TRIGGER sync_products_to_catalog_trigger
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (NEW.recipe_id IS NOT NULL)
  EXECUTE FUNCTION sync_products_to_product_catalog();

DROP TRIGGER IF EXISTS update_availability_trigger ON inventory_stock;
CREATE TRIGGER update_availability_trigger
  AFTER UPDATE ON inventory_stock
  FOR EACH ROW
  WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity)
  EXECUTE FUNCTION update_product_availability();