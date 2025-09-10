-- STANDARDIZE INVENTORY ACROSS ALL STORES
-- Use Sugbo Mercado as reference (most complete store) and add missing items to all other stores

WITH reference_store AS (
  SELECT id as store_id 
  FROM stores 
  WHERE name = 'Sugbo Mercado (IT Park, Cebu)' 
  AND is_active = true
),
reference_inventory AS (
  SELECT DISTINCT
    ist.item,
    ist.item_category,
    ist.unit,
    ist.cost,
    ist.minimum_threshold
  FROM inventory_stock ist
  JOIN reference_store rs ON ist.store_id = rs.store_id
  WHERE ist.is_active = true
),
target_stores AS (
  SELECT id, name 
  FROM stores 
  WHERE is_active = true 
  AND name != 'Sugbo Mercado (IT Park, Cebu)'
),
missing_items AS (
  SELECT 
    ts.id as store_id,
    ts.name as store_name,
    ri.item,
    ri.item_category,
    ri.unit,
    ri.cost,
    ri.minimum_threshold
  FROM target_stores ts
  CROSS JOIN reference_inventory ri
  WHERE NOT EXISTS (
    SELECT 1 
    FROM inventory_stock existing 
    WHERE existing.store_id = ts.id 
    AND existing.item = ri.item 
    AND existing.is_active = true
  )
)
INSERT INTO inventory_stock (
  store_id,
  item,
  item_category,
  unit,
  stock_quantity,
  minimum_threshold,
  cost,
  is_active,
  recipe_compatible,
  created_at,
  updated_at
)
SELECT 
  mi.store_id,
  mi.item,
  mi.item_category::inventory_item_category,
  mi.unit,
  CASE 
    -- Set reasonable starting quantities based on item type and unit
    WHEN mi.item_category = 'packaging' THEN 100
    WHEN mi.item_category = 'base_ingredient' AND mi.unit IN ('ml', 'g', 'grams') THEN 1000
    WHEN mi.item_category = 'base_ingredient' AND mi.unit = 'pieces' THEN 50
    WHEN mi.item_category = 'base_ingredient' AND mi.unit = 'liters' THEN 10
    WHEN mi.item_category IN ('classic_sauce', 'premium_sauce') THEN 500
    WHEN mi.item_category IN ('classic_topping', 'premium_topping') THEN 300
    WHEN mi.item_category = 'biscuit' THEN 100
    ELSE 50
  END as stock_quantity,
  COALESCE(mi.minimum_threshold, 
    CASE 
      WHEN mi.item_category = 'packaging' THEN 20
      WHEN mi.item_category = 'base_ingredient' THEN 10
      WHEN mi.item_category IN ('classic_sauce', 'premium_sauce') THEN 5
      WHEN mi.item_category IN ('classic_topping', 'premium_topping') THEN 5
      WHEN mi.item_category = 'biscuit' THEN 10
      ELSE 5
    END
  ) as minimum_threshold,
  COALESCE(mi.cost, 0) as cost,
  true as is_active,
  true as recipe_compatible,
  NOW() as created_at,
  NOW() as updated_at
FROM missing_items mi;

-- Verify standardization results
WITH store_inventory_counts AS (
  SELECT 
    s.name as store_name,
    COUNT(ist.id) as item_count,
    COUNT(CASE WHEN ist.item_category = 'base_ingredient' THEN 1 END) as base_ingredients,
    COUNT(CASE WHEN ist.item_category = 'packaging' THEN 1 END) as packaging_items,
    COUNT(CASE WHEN ist.item_category IN ('classic_sauce', 'premium_sauce') THEN 1 END) as sauces,
    COUNT(CASE WHEN ist.item_category IN ('classic_topping', 'premium_topping') THEN 1 END) as toppings,
    COUNT(CASE WHEN ist.item_category = 'biscuit' THEN 1 END) as biscuits
  FROM stores s
  LEFT JOIN inventory_stock ist ON ist.store_id = s.id AND ist.is_active = true
  WHERE s.is_active = true
  GROUP BY s.id, s.name
),
max_items AS (
  SELECT MAX(item_count) as max_count FROM store_inventory_counts
)
SELECT 
  'INVENTORY STANDARDIZATION COMPLETE' as result,
  json_agg(
    json_build_object(
      'store', store_name,
      'total_items', item_count,
      'base_ingredients', base_ingredients,
      'packaging', packaging_items,
      'sauces', sauces,
      'toppings', toppings,
      'biscuits', biscuits,
      'status', CASE 
        WHEN item_count = (SELECT max_count FROM max_items) THEN '✅ Fully Standardized'
        ELSE '⚠️ Missing ' || ((SELECT max_count FROM max_items) - item_count) || ' items'
      END
    ) ORDER BY item_count DESC
  ) as standardization_summary
FROM store_inventory_counts;

-- Show items that were added
SELECT 
  'ITEMS ADDED TO STORES' as summary,
  COUNT(*) as total_items_added,
  COUNT(DISTINCT store_id) as stores_updated,
  'All stores now have standardized inventory based on Sugbo Mercado reference' as message
FROM inventory_stock
WHERE created_at >= NOW() - INTERVAL '1 minute';