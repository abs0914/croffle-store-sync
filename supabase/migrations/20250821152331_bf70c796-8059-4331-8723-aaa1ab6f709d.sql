-- Complete Product Catalog Standardization Migration (Corrected)
-- Phase 1: Deploy all unified recipes to all stores consistently

-- First, get all unique recipe templates that should exist in every store
WITH base_recipes AS (
  SELECT DISTINCT 
    name,
    serving_size,
    total_cost,
    cost_per_serving
  FROM unified_recipes 
  WHERE name IS NOT NULL 
  AND name != ''
  AND total_cost > 0
),
all_stores AS (
  SELECT id as store_id, name as store_name
  FROM stores 
  WHERE is_active = true
),
missing_recipes AS (
  SELECT 
    s.store_id,
    s.store_name,
    br.name,
    br.serving_size,
    br.total_cost,
    br.cost_per_serving
  FROM all_stores s
  CROSS JOIN base_recipes br
  WHERE NOT EXISTS (
    SELECT 1 FROM unified_recipes ur 
    WHERE ur.store_id = s.store_id 
    AND LOWER(TRIM(ur.name)) = LOWER(TRIM(br.name))
  )
)
INSERT INTO unified_recipes (
  store_id, name, serving_size, 
  total_cost, cost_per_serving, is_active, 
  created_at, updated_at
)
SELECT 
  store_id,
  name,
  serving_size,
  total_cost,
  cost_per_serving,
  true,
  NOW(),
  NOW()
FROM missing_recipes;

-- Copy ingredients for newly created recipes
WITH base_recipe_ingredients AS (
  SELECT DISTINCT
    ur1.name as recipe_name,
    uri.ingredient_name,
    uri.quantity,
    uri.unit,
    uri.cost_per_unit
  FROM unified_recipes ur1
  JOIN unified_recipe_ingredients uri ON ur1.id = uri.recipe_id
  WHERE ur1.total_cost > 0
  AND uri.ingredient_name IS NOT NULL
  AND uri.ingredient_name != ''
),
new_recipes AS (
  SELECT ur.id, ur.name, ur.store_id
  FROM unified_recipes ur
  WHERE ur.created_at > NOW() - INTERVAL '1 minute'
)
INSERT INTO unified_recipe_ingredients (
  recipe_id, ingredient_name, quantity, unit, cost_per_unit
)
SELECT 
  nr.id,
  bri.ingredient_name,
  bri.quantity,
  bri.unit,
  bri.cost_per_unit
FROM new_recipes nr
JOIN base_recipe_ingredients bri ON LOWER(TRIM(nr.name)) = LOWER(TRIM(bri.recipe_name))
WHERE NOT EXISTS (
  SELECT 1 FROM unified_recipe_ingredients uri2
  WHERE uri2.recipe_id = nr.id
  AND LOWER(TRIM(uri2.ingredient_name)) = LOWER(TRIM(bri.ingredient_name))
);

-- Phase 2: Create missing product catalog entries for all stores
WITH base_products AS (
  SELECT DISTINCT
    ur.name as product_name,
    ur.total_cost,
    'Beverages' as category_name,
    CASE 
      WHEN ur.total_cost > 0 THEN GREATEST(ur.total_cost * 2.5, 50)
      ELSE 150
    END as suggested_price
  FROM unified_recipes ur
  WHERE ur.name IS NOT NULL 
  AND ur.name != ''
  AND ur.is_active = true
),
stores_needing_products AS (
  SELECT 
    s.id as store_id,
    bp.product_name,
    bp.total_cost,
    bp.category_name,
    bp.suggested_price,
    ur.id as recipe_id
  FROM stores s
  CROSS JOIN base_products bp
  LEFT JOIN unified_recipes ur ON ur.store_id = s.id 
    AND LOWER(TRIM(ur.name)) = LOWER(TRIM(bp.product_name))
  WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_catalog pc 
    WHERE pc.store_id = s.id 
    AND LOWER(TRIM(pc.product_name)) = LOWER(TRIM(bp.product_name))
  )
)
INSERT INTO product_catalog (
  store_id, product_name, description, price, cost, 
  recipe_id, category_id, is_available, is_active,
  created_at, updated_at
)
SELECT 
  snp.store_id,
  snp.product_name,
  'Standardized product: ' || snp.product_name,
  snp.suggested_price,
  snp.total_cost,
  snp.recipe_id,
  (SELECT id FROM categories WHERE name = 'Beverages' AND store_id = snp.store_id LIMIT 1),
  true,
  true,
  NOW(),
  NOW()
FROM stores_needing_products snp
WHERE snp.recipe_id IS NOT NULL;

-- Phase 3: Standardize pricing across all stores
UPDATE product_catalog 
SET 
  price = CASE 
    WHEN ur.total_cost > 0 THEN GREATEST(ur.total_cost * 2.5, 50)
    ELSE GREATEST(product_catalog.price, 50)
  END,
  cost = COALESCE(ur.total_cost, product_catalog.cost, 0),
  updated_at = NOW()
FROM unified_recipes ur
WHERE product_catalog.recipe_id = ur.id
AND ur.total_cost > 0;

-- Phase 4: Link unlinked products to their recipes
UPDATE product_catalog 
SET 
  recipe_id = ur.id,
  cost = ur.total_cost,
  price = CASE 
    WHEN ur.total_cost > 0 THEN GREATEST(ur.total_cost * 2.5, product_catalog.price)
    ELSE product_catalog.price
  END,
  updated_at = NOW()
FROM unified_recipes ur
WHERE product_catalog.recipe_id IS NULL
AND product_catalog.store_id = ur.store_id
AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(ur.name));

-- Phase 5: Create default categories if missing
INSERT INTO categories (store_id, name, description, is_active)
SELECT DISTINCT
  s.id,
  'Beverages',
  'Coffee and beverage products',
  true
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM categories c 
  WHERE c.store_id = s.id 
  AND c.name = 'Beverages'
);

-- Update product catalog entries to use the correct category
UPDATE product_catalog 
SET category_id = c.id
FROM categories c
WHERE product_catalog.store_id = c.store_id
AND c.name = 'Beverages'
AND product_catalog.category_id IS NULL;

-- Final validation query to show results
SELECT 
  'Product Catalog Standardization Complete' as status,
  COUNT(DISTINCT s.id) as total_active_stores,
  COUNT(DISTINCT pc.product_name) as unique_products_deployed,
  ROUND(AVG(store_products.product_count), 0) as avg_products_per_store,
  COUNT(DISTINCT CASE WHEN pc.recipe_id IS NOT NULL THEN pc.id END) as products_with_recipes,
  ROUND(
    (COUNT(DISTINCT CASE WHEN pc.recipe_id IS NOT NULL THEN pc.id END)::numeric / 
     NULLIF(COUNT(DISTINCT pc.id)::numeric, 0)) * 100, 1
  ) as recipe_link_percentage
FROM stores s
LEFT JOIN product_catalog pc ON s.id = pc.store_id AND pc.is_available = true
LEFT JOIN (
  SELECT store_id, COUNT(*) as product_count 
  FROM product_catalog 
  WHERE is_available = true 
  GROUP BY store_id
) store_products ON s.id = store_products.store_id
WHERE s.is_active = true;