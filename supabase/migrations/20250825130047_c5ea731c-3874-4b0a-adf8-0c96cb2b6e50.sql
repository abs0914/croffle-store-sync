-- Simple Product-Recipe Linking without Function Call

-- Step 1: Link existing recipes to product catalog using enhanced fuzzy matching
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.is_available = true
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true
  AND (
    -- Exact match
    LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name))
    -- Flavor-based fuzzy matching
    OR (LOWER(product_catalog.product_name) LIKE '%biscoff%' AND LOWER(r.name) LIKE '%biscoff%')
    OR (LOWER(product_catalog.product_name) LIKE '%matcha%' AND LOWER(r.name) LIKE '%matcha%')
    OR (LOWER(product_catalog.product_name) LIKE '%caramel%' AND LOWER(r.name) LIKE '%caramel%')
    OR (LOWER(product_catalog.product_name) LIKE '%chocolate%' AND LOWER(r.name) LIKE '%chocolate%')
    OR (LOWER(product_catalog.product_name) LIKE '%vanilla%' AND LOWER(r.name) LIKE '%vanilla%')
    OR (LOWER(product_catalog.product_name) LIKE '%strawberry%' AND LOWER(r.name) LIKE '%strawberry%')
    OR (LOWER(product_catalog.product_name) LIKE '%blueberry%' AND LOWER(r.name) LIKE '%blueberry%')
    OR (LOWER(product_catalog.product_name) LIKE '%coffee%' AND LOWER(r.name) LIKE '%coffee%')
    OR (LOWER(product_catalog.product_name) LIKE '%latte%' AND LOWER(r.name) LIKE '%latte%')
    OR (LOWER(product_catalog.product_name) LIKE '%cappuccino%' AND LOWER(r.name) LIKE '%cappuccino%')
    OR (LOWER(product_catalog.product_name) LIKE '%americano%' AND LOWER(r.name) LIKE '%americano%')
    OR (LOWER(product_catalog.product_name) LIKE '%espresso%' AND LOWER(r.name) LIKE '%espresso%')
    -- Remove "croffle" suffix for comparison
    OR LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(REPLACE(r.name, ' Croffle', '')))
    OR LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(REPLACE(r.name, 'Croffle ', '')))
    -- Substring matching (broader)
    OR LOWER(TRIM(product_catalog.product_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
    OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(product_catalog.product_name)) || '%'
  );

-- Step 2: Create missing templates only for products that truly need them
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
  'Template for ' || pc.product_name,
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
       OR LOWER(TRIM(rt.name)) LIKE '%' || LOWER(TRIM(pc.product_name)) || '%'
       OR LOWER(TRIM(pc.product_name)) LIKE '%' || LOWER(TRIM(rt.name)) || '%'
  )
  -- Only create templates for really unique products
  AND NOT EXISTS (
    SELECT 1 FROM recipe_templates rt
    WHERE (LOWER(pc.product_name) LIKE '%biscoff%' AND LOWER(rt.name) LIKE '%biscoff%')
       OR (LOWER(pc.product_name) LIKE '%matcha%' AND LOWER(rt.name) LIKE '%matcha%')
       OR (LOWER(pc.product_name) LIKE '%caramel%' AND LOWER(rt.name) LIKE '%caramel%')
       OR (LOWER(pc.product_name) LIKE '%chocolate%' AND LOWER(rt.name) LIKE '%chocolate%')
  );

-- Step 3: Final verification pass
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true
  AND product_catalog.is_available = true
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name));