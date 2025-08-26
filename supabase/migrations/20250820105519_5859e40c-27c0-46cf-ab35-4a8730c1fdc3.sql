-- Step 1: Clean up duplicate products - keep only the most recent version of each product per store
-- First, identify which products to keep (most recent ones with valid recipe_id)
WITH ranked_products AS (
  SELECT 
    id,
    name,
    store_id,
    recipe_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY name, store_id 
      ORDER BY 
        CASE WHEN recipe_id IS NOT NULL THEN 0 ELSE 1 END,  -- Prefer products with recipe_id
        created_at DESC  -- Then by most recent
    ) as rn
  FROM products 
  WHERE name IN ('Tiramisu Croffle', 'Caramel Delight')
),
products_to_keep AS (
  SELECT id FROM ranked_products WHERE rn = 1
),
products_to_delete AS (
  SELECT id FROM ranked_products WHERE rn > 1
)

-- Delete duplicate products (this will help with the sync issues)
DELETE FROM products 
WHERE id IN (SELECT id FROM products_to_delete);

-- Now clean up any orphaned transaction_items that reference deleted products
UPDATE transaction_items 
SET product_id = (
  SELECT p.id 
  FROM products p 
  WHERE p.name = CASE 
    WHEN transaction_items.product_type = 'Tiramisu Croffle' THEN 'Tiramisu Croffle'
    WHEN transaction_items.product_type = 'Caramel Delight' THEN 'Caramel Delight'
    ELSE transaction_items.product_type
  END
  AND p.store_id = (
    SELECT store_id FROM transactions WHERE id = transaction_items.transaction_id
  )
  LIMIT 1
)
WHERE product_id NOT IN (SELECT id FROM products);

-- Update product_catalog to ensure consistency with cleaned products
UPDATE product_catalog 
SET recipe_id = (
  SELECT p.recipe_id 
  FROM products p 
  WHERE p.name = product_catalog.product_name 
  AND p.store_id = product_catalog.store_id
  AND p.recipe_id IS NOT NULL
  LIMIT 1
)
WHERE product_name IN ('Tiramisu Croffle', 'Caramel Delight')
AND (recipe_id IS NULL OR recipe_id NOT IN (SELECT id FROM recipes));

-- Create function to prevent duplicate products in the future
CREATE OR REPLACE FUNCTION prevent_duplicate_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a product with the same name already exists in this store
  IF EXISTS (
    SELECT 1 FROM products 
    WHERE name = NEW.name 
    AND store_id = NEW.store_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Product "%" already exists in this store', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate products
DROP TRIGGER IF EXISTS prevent_duplicate_products_trigger ON products;
CREATE TRIGGER prevent_duplicate_products_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_products();