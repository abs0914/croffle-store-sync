-- Data Integrity Repair: Fix Product-Recipe Links (Corrected)
-- Focus only on linking product_catalog to recipes, avoid touching recipes.product_id

-- Step 1: Link product_catalog entries to existing recipes by matching name and store_id
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name))
  AND r.is_active = true
  AND product_catalog.is_available = true;

-- Step 2: Handle special cases with fuzzy matching for similar names
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true
  AND product_catalog.is_available = true
  AND (
    -- Handle cases where one has "Croffle" and the other doesn't
    (product_catalog.product_name ILIKE '%' || REPLACE(r.name, ' Croffle', '') || '%' AND r.name LIKE '%Croffle%')
    OR
    (r.name ILIKE '%' || REPLACE(product_catalog.product_name, ' Croffle', '') || '%' AND product_catalog.product_name LIKE '%Croffle%')
    OR
    -- Handle cases with slight variations (Biscoff vs Biscoff Croffle)
    (product_catalog.product_name ILIKE '%biscoff%' AND r.name ILIKE '%biscoff%')
    OR
    (product_catalog.product_name ILIKE '%caramel%' AND r.name ILIKE '%caramel%')
    OR
    (product_catalog.product_name ILIKE '%chocolate%' AND r.name ILIKE '%chocolate%')
  );

-- Step 3: Create product_catalog entries for orphaned recipes (recipes without catalog entries)
INSERT INTO product_catalog (
  store_id,
  product_name,
  description,
  price,
  recipe_id,
  is_available,
  created_at,
  updated_at
)
SELECT DISTINCT
  r.store_id,
  r.name,
  COALESCE(r.instructions, 'Auto-generated from recipe'),
  GREATEST(COALESCE(r.total_cost * 2.5, 100.00), 50.00), -- Apply markup with minimum price
  r.id,
  true,
  NOW(),
  NOW()
FROM recipes r
WHERE r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc 
    WHERE pc.recipe_id = r.id
      OR (pc.store_id = r.store_id AND LOWER(TRIM(pc.product_name)) = LOWER(TRIM(r.name)))
  );

-- Step 4: Add function to maintain product-recipe links going forward
CREATE OR REPLACE FUNCTION ensure_product_recipe_link()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting/updating a product with no recipe_id, try to find matching recipe
  IF NEW.recipe_id IS NULL THEN
    SELECT id INTO NEW.recipe_id 
    FROM recipes 
    WHERE store_id = NEW.store_id 
      AND is_active = true
      AND (
        LOWER(TRIM(name)) = LOWER(TRIM(NEW.product_name))
        OR name ILIKE '%' || NEW.product_name || '%'
        OR NEW.product_name ILIKE '%' || name || '%'
      )
    ORDER BY 
      CASE 
        WHEN LOWER(TRIM(name)) = LOWER(TRIM(NEW.product_name)) THEN 1
        ELSE 2
      END
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to maintain data integrity
DROP TRIGGER IF EXISTS product_recipe_link_trigger ON product_catalog;
CREATE TRIGGER product_recipe_link_trigger
  BEFORE INSERT OR UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION ensure_product_recipe_link();