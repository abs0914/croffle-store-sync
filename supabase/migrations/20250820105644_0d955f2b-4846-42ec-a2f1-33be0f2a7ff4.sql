-- Clean up duplicate products step by step
-- First, let's see what we're working with and clean up one by one

-- Step 1: Clean up Tiramisu Croffle duplicates - keep one per store with recipe_id
WITH tiramisu_ranked AS (
  SELECT 
    id,
    store_id,
    recipe_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY store_id 
      ORDER BY 
        CASE WHEN recipe_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
    ) as rn
  FROM products 
  WHERE name = 'Tiramisu Croffle'
)
DELETE FROM products 
WHERE id IN (
  SELECT id FROM tiramisu_ranked WHERE rn > 1
);

-- Step 2: Clean up Caramel Delight duplicates - keep one per store with recipe_id  
WITH caramel_ranked AS (
  SELECT 
    id,
    store_id,
    recipe_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY store_id 
      ORDER BY 
        CASE WHEN recipe_id IS NOT NULL THEN 0 ELSE 1 END,
        created_at DESC
    ) as rn
  FROM products 
  WHERE name = 'Caramel Delight'
)
DELETE FROM products 
WHERE id IN (
  SELECT id FROM caramel_ranked WHERE rn > 1
);

-- Step 3: Update product_catalog to reference the remaining products
UPDATE product_catalog 
SET recipe_id = (
  SELECT p.recipe_id 
  FROM products p 
  WHERE p.name = product_catalog.product_name 
  AND p.store_id = product_catalog.store_id
  AND p.recipe_id IS NOT NULL
  LIMIT 1
)
WHERE product_name IN ('Tiramisu Croffle', 'Caramel Delight');

-- Step 4: Create function to prevent future duplicates
CREATE OR REPLACE FUNCTION check_product_uniqueness()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.name != NEW.name OR OLD.store_id != NEW.store_id)) THEN
    IF EXISTS (
      SELECT 1 FROM products 
      WHERE name = NEW.name 
      AND store_id = NEW.store_id 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Product "%" already exists in this store', NEW.name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent future duplicates
DROP TRIGGER IF EXISTS check_product_uniqueness_trigger ON products;
CREATE TRIGGER check_product_uniqueness_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION check_product_uniqueness();