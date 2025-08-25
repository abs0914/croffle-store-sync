-- Enhanced Product-Recipe Linking with Fuzzy Matching and Template Deployment

-- Step 1: Enhanced fuzzy matching for product catalog to existing templates
WITH fuzzy_matches AS (
  SELECT DISTINCT ON (pc.id)
    pc.id as catalog_id,
    rt.id as template_id,
    pc.product_name,
    rt.name as template_name,
    CASE 
      -- Exact match (highest priority)
      WHEN LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name)) THEN 1
      -- Product name contains template name
      WHEN LOWER(TRIM(pc.product_name)) LIKE '%' || LOWER(TRIM(rt.name)) || '%' THEN 2
      -- Template name contains product name  
      WHEN LOWER(TRIM(rt.name)) LIKE '%' || LOWER(TRIM(pc.product_name)) || '%' THEN 3
      -- Fuzzy matching for common patterns
      WHEN (LOWER(pc.product_name) LIKE '%biscoff%' AND LOWER(rt.name) LIKE '%biscoff%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%matcha%' AND LOWER(rt.name) LIKE '%matcha%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%caramel%' AND LOWER(rt.name) LIKE '%caramel%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%chocolate%' AND LOWER(rt.name) LIKE '%chocolate%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%vanilla%' AND LOWER(rt.name) LIKE '%vanilla%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%strawberry%' AND LOWER(rt.name) LIKE '%strawberry%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%blueberry%' AND LOWER(rt.name) LIKE '%blueberry%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%coffee%' AND LOWER(rt.name) LIKE '%coffee%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%latte%' AND LOWER(rt.name) LIKE '%latte%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%cappuccino%' AND LOWER(rt.name) LIKE '%cappuccino%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%americano%' AND LOWER(rt.name) LIKE '%americano%') THEN 4
      WHEN (LOWER(pc.product_name) LIKE '%espresso%' AND LOWER(rt.name) LIKE '%espresso%') THEN 4
      -- Word-based matching (remove "croffle" from template names for comparison)
      WHEN LOWER(TRIM(pc.product_name)) = LOWER(TRIM(REPLACE(rt.name, ' Croffle', ''))) THEN 5
      WHEN LOWER(TRIM(pc.product_name)) = LOWER(TRIM(REPLACE(rt.name, 'Croffle ', ''))) THEN 5
      ELSE 99
    END as match_priority
  FROM product_catalog pc
  CROSS JOIN recipe_templates rt
  WHERE pc.recipe_id IS NULL 
    AND pc.is_available = true
    AND rt.is_active = true
    AND (
      -- Exact or substring matches
      LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name))
      OR LOWER(TRIM(pc.product_name)) LIKE '%' || LOWER(TRIM(rt.name)) || '%'
      OR LOWER(TRIM(rt.name)) LIKE '%' || LOWER(TRIM(pc.product_name)) || '%'
      -- Flavor-based matching
      OR (LOWER(pc.product_name) LIKE '%biscoff%' AND LOWER(rt.name) LIKE '%biscoff%')
      OR (LOWER(pc.product_name) LIKE '%matcha%' AND LOWER(rt.name) LIKE '%matcha%')
      OR (LOWER(pc.product_name) LIKE '%caramel%' AND LOWER(rt.name) LIKE '%caramel%')
      OR (LOWER(pc.product_name) LIKE '%chocolate%' AND LOWER(rt.name) LIKE '%chocolate%')
      OR (LOWER(pc.product_name) LIKE '%vanilla%' AND LOWER(rt.name) LIKE '%vanilla%')
      OR (LOWER(pc.product_name) LIKE '%strawberry%' AND LOWER(rt.name) LIKE '%strawberry%')
      OR (LOWER(pc.product_name) LIKE '%blueberry%' AND LOWER(rt.name) LIKE '%blueberry%')
      OR (LOWER(pc.product_name) LIKE '%coffee%' AND LOWER(rt.name) LIKE '%coffee%')
      OR (LOWER(pc.product_name) LIKE '%latte%' AND LOWER(rt.name) LIKE '%latte%')
      OR (LOWER(pc.product_name) LIKE '%cappuccino%' AND LOWER(rt.name) LIKE '%cappuccino%')
      OR (LOWER(pc.product_name) LIKE '%americano%' AND LOWER(rt.name) LIKE '%americano%')
      OR (LOWER(pc.product_name) LIKE '%espresso%' AND LOWER(rt.name) LIKE '%espresso%')
      -- Remove "croffle" for comparison
      OR LOWER(TRIM(pc.product_name)) = LOWER(TRIM(REPLACE(rt.name, ' Croffle', '')))
      OR LOWER(TRIM(pc.product_name)) = LOWER(TRIM(REPLACE(rt.name, 'Croffle ', '')))
    )
  ORDER BY pc.id, match_priority ASC
),
-- Create recipes from matched templates
recipe_creations AS (
  INSERT INTO recipes (
    name, 
    store_id, 
    template_id, 
    is_active, 
    serving_size, 
    total_cost, 
    cost_per_serving,
    instructions,
    created_at,
    updated_at
  )
  SELECT DISTINCT
    fm.product_name,
    pc.store_id,
    fm.template_id,
    true,
    1,
    0, -- Will be calculated after ingredients are added
    0, -- Will be calculated after ingredients are added
    'Auto-generated recipe from template: ' || fm.template_name,
    NOW(),
    NOW()
  FROM fuzzy_matches fm
  JOIN product_catalog pc ON pc.id = fm.catalog_id
  WHERE NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.store_id = pc.store_id 
      AND r.template_id = fm.template_id 
      AND r.is_active = true
  )
  RETURNING id, name, store_id, template_id
)
-- Link the new recipes to product catalog
UPDATE product_catalog 
SET recipe_id = rc.id,
    updated_at = NOW()
FROM recipe_creations rc
WHERE product_catalog.store_id = rc.store_id
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(rc.name))
  AND product_catalog.recipe_id IS NULL;

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
  );

-- Step 3: Deploy all template-to-recipe links using the existing function
SELECT deploy_and_fix_recipe_templates_to_all_stores();

-- Step 4: Final cleanup - link any remaining product catalog entries to recipes
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name))
  AND r.is_active = true
  AND product_catalog.is_available = true;