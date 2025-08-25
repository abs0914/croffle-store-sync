-- Data Integrity Repair: Disable specific trigger and fix links

-- Step 1: Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS sync_product_catalog_changes_trigger ON product_catalog;

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

-- Step 3: Handle specific case for Biscoff Croffle (user's reported issue)
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.product_name ILIKE '%biscoff%croffle%'
  AND r.name ILIKE '%biscoff%croffle%'
  AND product_catalog.recipe_id IS NULL
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true
  AND product_catalog.is_available = true;

-- Step 4: Handle fuzzy matching for similar names
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true
  AND product_catalog.is_available = true
  AND (
    -- Caramel variations  
    (product_catalog.product_name ILIKE '%caramel%' AND r.name ILIKE '%caramel%')
    OR
    -- Chocolate variations
    (product_catalog.product_name ILIKE '%choco%' AND r.name ILIKE '%choco%')
  );

-- Step 5: Recreate the trigger but with safer logic
CREATE TRIGGER sync_product_catalog_changes_trigger
  AFTER UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION sync_product_catalog_changes();