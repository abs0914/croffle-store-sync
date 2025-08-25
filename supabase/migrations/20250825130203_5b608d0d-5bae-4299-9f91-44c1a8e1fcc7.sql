-- Final cleanup for remaining 19 products with existing templates

-- Create recipes for products that have templates but no recipes
WITH missing_recipes AS (
  SELECT DISTINCT
    pc.store_id,
    pc.product_name,
    rt.id as template_id,
    rt.name as template_name
  FROM product_catalog pc
  CROSS JOIN recipe_templates rt
  WHERE pc.recipe_id IS NULL 
    AND pc.is_available = true
    AND rt.is_active = true
    AND (
      LOWER(TRIM(pc.product_name)) = LOWER(TRIM(rt.name))
      OR LOWER(TRIM(rt.name)) LIKE '%' || LOWER(TRIM(pc.product_name)) || '%'
      OR LOWER(TRIM(pc.product_name)) LIKE '%' || LOWER(TRIM(rt.name)) || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM recipes r 
      WHERE r.store_id = pc.store_id 
        AND r.template_id = rt.id 
        AND r.is_active = true
    )
),
created_recipes AS (
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
  SELECT 
    mr.product_name,
    mr.store_id,
    mr.template_id,
    true,
    1,
    0,
    0,
    'Auto-generated recipe from template: ' || mr.template_name,
    NOW(),
    NOW()
  FROM missing_recipes mr
  RETURNING id, name, store_id, template_id
)
-- Link the newly created recipes to product catalog
UPDATE product_catalog 
SET recipe_id = cr.id,
    updated_at = NOW()
FROM created_recipes cr
WHERE product_catalog.store_id = cr.store_id
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(cr.name))
  AND product_catalog.recipe_id IS NULL;

-- Final safety net: link any remaining products to existing recipes with exact name match
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.recipe_id IS NULL 
  AND product_catalog.store_id = r.store_id
  AND r.is_active = true
  AND product_catalog.is_available = true
  AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(r.name));