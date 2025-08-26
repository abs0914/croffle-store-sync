-- Enhanced Product-Recipe Linking with Duplicate-Safe Operations

-- Step 1: First, link existing recipes to product catalog entries using enhanced fuzzy matching
WITH fuzzy_matches AS (
  SELECT DISTINCT ON (pc.id)
    pc.id as catalog_id,
    r.id as recipe_id,
    pc.product_name,
    r.name as recipe_name,
    CASE 
      -- Exact match (highest priority)
      WHEN LOWER(TRIM(pc.product_name)) = LOWER(TRIM(r.name)) THEN 1
      -- Product name contains recipe name
      WHEN LOWER(TRIM(pc.product_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%' THEN 2
      -- Recipe name contains product name  
      WHEN LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(pc.product_name)) || '%' THEN 3
      -- Fuzzy matching for common patterns
      WHEN (LOWER(pc.product_name) LIKE '%biscoff%' AND LOWER(r.name) LIKE '%biscoff%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%matcha%' AND LOWER(r.name) LIKE '%matcha%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%caramel%' AND LOWER(r.name) LIKE '%caramel%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%chocolate%' AND LOWER(r.name) LIKE '%chocolate%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%vanilla%' AND LOWER(r.name) LIKE '%vanilla%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%strawberry%' AND LOWER(r.name) LIKE '%strawberry%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%blueberry%' AND LOWER(r.name) LIKE '%blueberry%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%coffee%' AND LOWER(r.name) LIKE '%coffee%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%latte%' AND LOWER(r.name) LIKE '%latte%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%cappuccino%' AND LOWER(r.name) LIKE '%cappuccino%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%americano%' AND LOWER(r.name) LIKE '%americano%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%espresso%' AND LOWER(r.name) LIKE '%espresso%') THEN 4
      -- Word-based matching (remove "croffle" from recipe names for comparison)
      WHEN LOWER(TRIM(pc.product_name)) = LOWER(TRIM(REPLACE(r.name, ' Croffle', ''))) THEN 5
      WHEN LOWER(TRIM(pc.product_name)) = LOWER(TRIM(REPLACE(r.name, 'Croffle ', ''))) THEN 5
      ELSE 99
    END as match_priority
  FROM product_catalog pc
  CROSS JOIN recipes r
  WHERE pc.recipe_id IS NULL 
    AND pc.is_available = true
    AND r.is_active = true
    AND pc.store_id = r.store_id -- Must be same store
    AND (
      -- Exact or substring matches
      LOWER(TRIM(pc.product_name)) = LOWER(TRIM(r.name))
      OR LOWER(TRIM(pc.product_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
      OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(pc.product_name)) || '%'
      -- Flavor-based matching
      OR (LOWER(pc.product_name) LIKE '%biscoff%' AND LOWER(r.name) LIKE '%biscoff%')
      OR (LOWER(pc.product_name) LIKE '%matcha%' AND LOWER(r.name) LIKE '%matcha%')
      OR (LOWER(pc.product_name) LIKE '%caramel%' AND LOWER(r.name) LIKE '%caramel%')
      OR (LOWER(pc.product_name) LIKE '%chocolate%' AND LOWER(r.name) LIKE '%chocolate%')
      OR (LOWER(pc.product_name) LIKE '%vanilla%' AND LOWER(r.name) LIKE '%vanilla%')
      OR (LOWER(pc.product_name) LIKE '%strawberry%' AND LOWER(r.name) LIKE '%strawberry%')
      OR (LOWER(pc.product_name) LIKE '%blueberry%' AND LOWER(r.name) LIKE '%blueberry%')
      OR (LOWER(pc.product_name) LIKE '%coffee%' AND LOWER(r.name) LIKE '%coffee%')
      OR (LOWER(pc.product_name) LIKE '%latte%' AND LOWER(r.name) LIKE '%latte%')
      OR (LOWER(pc.product_name) LIKE '%cappuccino%' AND LOWER(r.name) LIKE '%cappuccino%')
      OR (LOWER(pc.product_name) LIKE '%americano%' AND LOWER(r.name) LIKE '%americano%')
      OR (LOWER(pc.product_name) LIKE '%espresso%' AND LOWER(r.name) LIKE '%espresso%')
      -- Remove "croffle" for comparison
      OR LOWER(TRIM(pc.product_name)) = LOWER(TRIM(REPLACE(r.name, ' Croffle', '')))
      OR LOWER(TRIM(pc.product_name)) = LOWER(TRIM(REPLACE(r.name, 'Croffle ', '')))
    )
  ORDER BY pc.id, match_priority ASC
)
-- Link existing recipes to product catalog
UPDATE product_catalog 
SET recipe_id = fm.recipe_id,
    updated_at = NOW()
FROM fuzzy_matches fm
WHERE product_catalog.id = fm.catalog_id;

-- Step 2: Create missing templates for products that still don't have matches
INSERT INTO recipe_templates (
  name,
  description,
  category_name,
  serving_size,
  instructions,
  is_active,
  created_at,
  updated_at
)
SELECT DISTINCT
  pc.product_name,
  'Auto-generated template for ' || pc.product_name,
  CASE 
    WHEN LOWER(pc.product_name) LIKE '%croffle%' THEN 'croffle'
    WHEN LOWER(pc.product_name) LIKE '%coffee%' OR LOWER(pc.product_name) LIKE '%latte%' 
         OR LOWER(pc.product_name) LIKE '%cappuccino%' OR LOWER(pc.product_name) LIKE '%americano%'
         OR LOWER(pc.product_name) LIKE '%espresso%' THEN 'beverage'
    WHEN LOWER(pc.product_name) LIKE '%frappe%' OR LOWER(pc.product_name) LIKE '%smoothie%'
         OR LOWER(pc.product_name) LIKE '%shake%' THEN 'beverage'
    ELSE 'other'
  END,
  1,
  'Standard preparation instructions',
  true,
  NOW(),
  NOW()
FROM product_catalog pc
WHERE pc.recipe_id IS NULL 
  AND pc.is_available = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_templates rt 
    WHERE LOWER(TRIM(rt.name)) = LOWER(TRIM(pc.product_name))
  )
  AND NOT EXISTS (
    SELECT 1 FROM recipe_templates rt
    WHERE LOWER(TRIM(rt.name)) LIKE '%' || LOWER(TRIM(pc.product_name)) || '%'
       OR LOWER(TRIM(pc.product_name)) LIKE '%' || LOWER(TRIM(rt.name)) || '%'
  )
ON CONFLICT (name) DO NOTHING; -- Ignore if template already exists

-- Step 3: Use the existing deployment function to create recipes from templates
-- This function handles duplicates gracefully
SELECT deploy_and_fix_recipe_templates_to_all_stores();

-- Step 4: Final cleanup - link any remaining product catalog entries to recipes
-- This handles both newly created recipes and any that were missed in Step 1
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true
  AND product_catalog.is_available = true
  AND (
    LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name))
    OR LOWER(TRIM(product_catalog.product_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
    OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(product_catalog.product_name)) || '%'
    -- Flavor-based matching for final cleanup
    OR (LOWER(product_catalog.product_name) LIKE '%biscoff%' AND LOWER(r.name) LIKE '%biscoff%')
    OR (LOWER(product_catalog.product_name) LIKE '%matcha%' AND LOWER(r.name) LIKE '%matcha%')
    OR (LOWER(product_catalog.product_name) LIKE '%caramel%' AND LOWER(r.name) LIKE '%caramel%')
  );