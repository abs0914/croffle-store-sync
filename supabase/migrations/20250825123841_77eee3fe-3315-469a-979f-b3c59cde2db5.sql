-- Data Integrity Repair: Fix Product-Recipe Links (Final Fix)
-- Disable triggers temporarily to avoid conflicts during repair

-- Step 1: Temporarily disable the sync trigger to prevent conflicts
ALTER TABLE product_catalog DISABLE TRIGGER ALL;

-- Step 2: Link product_catalog entries to existing recipes by exact name match
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name))
  AND r.is_active = true
  AND product_catalog.is_available = true;

-- Step 3: Handle fuzzy matching for similar names (like Biscoff vs Biscoff Croffle)
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true
  AND product_catalog.is_available = true
  AND (
    -- Biscoff variations
    (product_catalog.product_name ILIKE '%biscoff%' AND r.name ILIKE '%biscoff%' AND 
     (product_catalog.product_name ILIKE '%croffle%' OR r.name ILIKE '%croffle%'))
    OR
    -- Caramel variations  
    (product_catalog.product_name ILIKE '%caramel%' AND r.name ILIKE '%caramel%')
    OR
    -- Chocolate variations
    (product_catalog.product_name ILIKE '%choco%' AND r.name ILIKE '%choco%')
    OR
    -- General croffle matching
    (product_catalog.product_name ILIKE '%croffle%' AND r.name ILIKE '%croffle%' AND
     SIMILARITY(product_catalog.product_name, r.name) > 0.6)
  );

-- Step 4: Re-enable triggers
ALTER TABLE product_catalog ENABLE TRIGGER ALL;

-- Step 5: Create function to maintain links without creating duplicates
CREATE OR REPLACE FUNCTION ensure_product_recipe_link_safe()
RETURNS TRIGGER AS $$
BEGIN
  -- Only try to find recipe_id if it's null and we're not in a bulk operation
  IF NEW.recipe_id IS NULL AND TG_OP = 'INSERT' THEN
    SELECT id INTO NEW.recipe_id 
    FROM recipes 
    WHERE store_id = NEW.store_id 
      AND is_active = true
      AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.product_name))
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Replace the old trigger with the safe version
DROP TRIGGER IF EXISTS product_recipe_link_trigger ON product_catalog;
CREATE TRIGGER product_recipe_link_trigger
  BEFORE INSERT ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION ensure_product_recipe_link_safe();