-- Data Integrity Repair: Simple Product-Recipe Link Fix
-- Just fix the data without touching triggers

-- Step 1: Link product_catalog entries to existing recipes by exact name match
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name))
  AND r.is_active = true
  AND product_catalog.is_available = true;

-- Step 2: Handle specific case for Biscoff Croffle (user's reported issue)
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

-- Step 3: Handle fuzzy matching for similar names
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
    OR
    -- Croffle matching where one side has croffle and other doesn't
    (product_catalog.product_name LIKE '%Croffle%' AND 
     r.name LIKE '%' || REPLACE(product_catalog.product_name, ' Croffle', '') || '%')
    OR
    (r.name LIKE '%Croffle%' AND 
     product_catalog.product_name LIKE '%' || REPLACE(r.name, ' Croffle', '') || '%')
  );

-- Step 4: Verify the fix for the specific Biscoff Croffle case
-- Check if the reported transaction ID product now has a recipe
SELECT 
  'Verification: Biscoff Croffle Link Status' as check_name,
  pc.product_name,
  pc.recipe_id IS NOT NULL as has_recipe,
  r.name as recipe_name
FROM product_catalog pc
LEFT JOIN recipes r ON pc.recipe_id = r.id
WHERE pc.product_name ILIKE '%biscoff%croffle%'
  AND pc.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'; -- Sugbo Mercado IT Park