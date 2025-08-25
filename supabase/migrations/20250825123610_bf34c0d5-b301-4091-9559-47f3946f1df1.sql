-- Data Integrity Repair: Fix Product-Recipe Links
-- This migration repairs broken links between product_catalog and recipes tables

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

-- Step 2: Link recipes to existing product_catalog entries by matching name and store_id  
UPDATE recipes
SET product_id = pc.id,
    updated_at = NOW()
FROM product_catalog pc
WHERE recipes.product_id IS NULL
  AND recipes.store_id = pc.store_id
  AND LOWER(TRIM(recipes.name)) = LOWER(TRIM(pc.product_name))
  AND recipes.is_active = true
  AND pc.is_available = true;

-- Step 3: Handle special cases where names might have slight variations
-- Update Biscoff Croffle specifically (the user's reported case)
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.product_name ILIKE '%biscoff%croffle%'
  AND r.name ILIKE '%biscoff%croffle%'
  AND product_catalog.recipe_id IS NULL
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true;

-- Step 4: Create missing product_catalog entries for recipes that don't have them
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
  COALESCE(r.total_cost * 2, 100.00), -- Default markup
  r.id,
  true,
  NOW(),
  NOW()
FROM recipes r
LEFT JOIN product_catalog pc ON (
  pc.recipe_id = r.id 
  OR (pc.store_id = r.store_id AND LOWER(TRIM(pc.product_name)) = LOWER(TRIM(r.name)))
)
WHERE r.is_active = true
  AND pc.id IS NULL
  AND r.product_id IS NULL;

-- Step 5: Update recipe product_id for newly created catalog entries
UPDATE recipes
SET product_id = pc.id,
    updated_at = NOW()
FROM product_catalog pc
WHERE recipes.product_id IS NULL
  AND pc.recipe_id = recipes.id
  AND recipes.is_active = true;

-- Step 6: Add function to prevent future data integrity issues
CREATE OR REPLACE FUNCTION ensure_recipe_product_link()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting/updating a recipe with no product_id, try to find matching product
  IF NEW.product_id IS NULL THEN
    SELECT id INTO NEW.product_id 
    FROM product_catalog 
    WHERE store_id = NEW.store_id 
      AND LOWER(TRIM(product_name)) = LOWER(TRIM(NEW.name))
      AND is_available = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add function to ensure product catalog has recipe link
CREATE OR REPLACE FUNCTION ensure_product_recipe_link()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting/updating a product with no recipe_id, try to find matching recipe
  IF NEW.recipe_id IS NULL THEN
    SELECT id INTO NEW.recipe_id 
    FROM recipes 
    WHERE store_id = NEW.store_id 
      AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.product_name))
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create triggers to maintain data integrity
DROP TRIGGER IF EXISTS recipe_product_link_trigger ON recipes;
CREATE TRIGGER recipe_product_link_trigger
  BEFORE INSERT OR UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION ensure_recipe_product_link();

DROP TRIGGER IF EXISTS product_recipe_link_trigger ON product_catalog;
CREATE TRIGGER product_recipe_link_trigger
  BEFORE INSERT OR UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION ensure_product_recipe_link();