-- Phase 1: Clean up duplicate categories and assign proper category_id values to product_catalog

-- Step 1: Create a function to get the canonical category ID for each store
CREATE OR REPLACE FUNCTION get_canonical_category_id(store_id_param UUID, category_name_param TEXT)
RETURNS UUID AS $$
DECLARE
  canonical_id UUID;
BEGIN
  -- Get the first category ID for this store and normalized category name
  SELECT id INTO canonical_id
  FROM categories 
  WHERE store_id = store_id_param 
    AND LOWER(name) = LOWER(category_name_param)
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN canonical_id;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update product_catalog with proper category assignments based on product names
UPDATE product_catalog 
SET category_id = get_canonical_category_id(store_id, 'Premium')
WHERE product_name ILIKE '%biscoff%' 
   OR product_name ILIKE '%choco overload%'
   OR product_name ILIKE '%cookies & cream%'
   OR product_name ILIKE '%dark chocolate%'
   OR product_name ILIKE '%kitkat%'
   OR product_name ILIKE '%matcha%'
   OR product_name ILIKE '%nutella%';

UPDATE product_catalog 
SET category_id = get_canonical_category_id(store_id, 'Fruity')
WHERE product_name ILIKE '%blueberry%'
   OR product_name ILIKE '%mango%'
   OR product_name ILIKE '%strawberry%';

UPDATE product_catalog 
SET category_id = get_canonical_category_id(store_id, 'Classic')
WHERE product_name ILIKE '%caramel delight%'
   OR product_name ILIKE '%choco marshmallow%'
   OR product_name ILIKE '%choco nut%'
   OR product_name ILIKE '%tiramisu%';

UPDATE product_catalog 
SET category_id = get_canonical_category_id(store_id, 'Mini Croffle')
WHERE LOWER(product_name) = 'mini croffle';

UPDATE product_catalog 
SET category_id = get_canonical_category_id(store_id, 'Croffle Overload')
WHERE LOWER(product_name) = 'croffle overload';

-- Step 3: Clean up duplicate categories (keep the earliest created one for each store/name combination)
WITH duplicate_categories AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY store_id, LOWER(name) ORDER BY created_at ASC) as rn
  FROM categories 
  WHERE LOWER(name) IN ('classic', 'fruity', 'premium', 'mini croffle', 'croffle overload')
)
DELETE FROM categories 
WHERE id IN (
  SELECT id FROM duplicate_categories WHERE rn > 1
);

-- Step 4: Update sync functions to handle category assignment properly
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
    category_id = NEW.category_id,  -- Add category sync
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
      NEW.category_id,  -- Use the category_id from product_catalog
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

-- Step 5: Update products table to sync category_id from product_catalog
UPDATE products 
SET category_id = pc.category_id
FROM product_catalog pc
WHERE products.store_id = pc.store_id 
  AND products.name = pc.product_name
  AND pc.category_id IS NOT NULL;

-- Clean up the helper function
DROP FUNCTION get_canonical_category_id(UUID, TEXT);