-- Final Product Catalog Standardization Migration
-- Using correct column names for product_catalog table

-- Step 1: Ensure all stores have the same base products
WITH base_products AS (
  SELECT DISTINCT
    product_name,
    description,
    price,
    category_id,
    recipe_id,
    image_url
  FROM product_catalog 
  WHERE is_available = true
  AND product_name IS NOT NULL 
  AND product_name != ''
),
all_stores AS (
  SELECT id as store_id, name as store_name
  FROM stores 
  WHERE is_active = true
),
missing_products AS (
  SELECT 
    s.store_id,
    bp.product_name,
    bp.description,
    bp.price,
    bp.recipe_id,
    bp.image_url
  FROM all_stores s
  CROSS JOIN base_products bp
  WHERE NOT EXISTS (
    SELECT 1 FROM product_catalog pc 
    WHERE pc.store_id = s.store_id 
    AND LOWER(TRIM(pc.product_name)) = LOWER(TRIM(bp.product_name))
  )
)
INSERT INTO product_catalog (
  store_id, product_name, description, price, 
  recipe_id, is_available, created_at, updated_at, image_url
)
SELECT 
  mp.store_id,
  mp.product_name,
  COALESCE(mp.description, 'Standardized product: ' || mp.product_name),
  COALESCE(mp.price, 150),
  mp.recipe_id,
  true,
  NOW(),
  NOW(),
  mp.image_url
FROM missing_products mp;

-- Step 2: Link unlinked products to their corresponding unified recipes
UPDATE product_catalog 
SET 
  recipe_id = ur.id,
  price = CASE 
    WHEN ur.total_cost > 0 THEN GREATEST(ur.total_cost * 2.5, product_catalog.price)
    ELSE product_catalog.price
  END,
  updated_at = NOW()
FROM unified_recipes ur
WHERE product_catalog.recipe_id IS NULL
AND product_catalog.store_id = ur.store_id
AND LOWER(TRIM(product_catalog.product_name)) = LOWER(TRIM(ur.name));

-- Step 3: Standardize pricing across all stores using recipe costs
UPDATE product_catalog 
SET 
  price = CASE 
    WHEN ur.total_cost > 0 THEN GREATEST(ur.total_cost * 2.5, 50)
    ELSE GREATEST(product_catalog.price, 50)
  END,
  updated_at = NOW()
FROM unified_recipes ur
WHERE product_catalog.recipe_id = ur.id
AND ur.total_cost > 0;

-- Step 4: Ensure all products have proper categories
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

-- Update products without categories
UPDATE product_catalog 
SET category_id = c.id, updated_at = NOW()
FROM categories c
WHERE product_catalog.store_id = c.store_id
AND c.name = 'Beverages'
AND product_catalog.category_id IS NULL;

-- Step 5: Create store consistency validation function
CREATE OR REPLACE FUNCTION validate_store_product_consistency()
RETURNS TABLE(
  store_id uuid,
  store_name text,
  total_products integer,
  products_with_recipes integer,
  products_with_pricing integer,
  consistency_score numeric
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    COUNT(pc.id)::integer as total_products,
    COUNT(CASE WHEN pc.recipe_id IS NOT NULL THEN 1 END)::integer as products_with_recipes,
    COUNT(CASE WHEN pc.price > 0 THEN 1 END)::integer as products_with_pricing,
    ROUND(
      (COUNT(CASE WHEN pc.recipe_id IS NOT NULL AND pc.price > 0 THEN 1 END)::numeric / 
       NULLIF(COUNT(pc.id)::numeric, 0)) * 100, 2
    ) as consistency_score
  FROM stores s
  LEFT JOIN product_catalog pc ON s.id = pc.store_id AND pc.is_available = true
  WHERE s.is_active = true
  GROUP BY s.id, s.name
  ORDER BY consistency_score DESC, total_products DESC;
END;
$$;

-- Step 6: Create monitoring table
CREATE TABLE IF NOT EXISTS product_catalog_audit (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_date timestamp with time zone DEFAULT NOW(),
  total_stores integer,
  standardized_stores integer,
  total_unique_products integer,
  average_products_per_store numeric,
  consistency_issues jsonb,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Step 7: Record standardization metrics
INSERT INTO product_catalog_audit (
  total_stores,
  standardized_stores, 
  total_unique_products,
  average_products_per_store,
  consistency_issues
)
SELECT 
  COUNT(DISTINCT s.id)::integer,
  COUNT(DISTINCT CASE WHEN store_stats.consistency_score >= 95 THEN s.id END)::integer,
  (SELECT COUNT(DISTINCT product_name) FROM product_catalog WHERE is_available = true)::integer,
  ROUND(AVG(store_stats.total_products), 2),
  jsonb_build_object(
    'stores_below_95_percent', 
    array_agg(DISTINCT s.name) FILTER (WHERE store_stats.consistency_score < 95)
  )
FROM stores s
LEFT JOIN validate_store_product_consistency() store_stats ON s.id = store_stats.store_id
WHERE s.is_active = true;

-- Final validation and results
SELECT 
  '✅ Product Catalog Standardization Complete' as status,
  COUNT(DISTINCT s.id) as total_active_stores,
  COUNT(DISTINCT pc.product_name) as unique_products_deployed,
  ROUND(AVG(store_products.product_count), 0) as avg_products_per_store,
  COUNT(DISTINCT CASE WHEN pc.recipe_id IS NOT NULL THEN pc.id END) as products_with_recipes,
  ROUND(
    (COUNT(DISTINCT CASE WHEN pc.recipe_id IS NOT NULL THEN pc.id END)::numeric / 
     NULLIF(COUNT(DISTINCT pc.id)::numeric, 0)) * 100, 1
  ) as recipe_link_percentage,
  MIN(store_products.product_count) as min_products_per_store,
  MAX(store_products.product_count) as max_products_per_store
FROM stores s
LEFT JOIN product_catalog pc ON s.id = pc.store_id AND pc.is_available = true
LEFT JOIN (
  SELECT store_id, COUNT(*) as product_count 
  FROM product_catalog 
  WHERE is_available = true 
  GROUP BY store_id
) store_products ON s.id = store_products.store_id
WHERE s.is_active = true;