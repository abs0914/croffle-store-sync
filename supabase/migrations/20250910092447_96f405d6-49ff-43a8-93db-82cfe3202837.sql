-- STANDARDIZE INVENTORY ACROSS ALL STORES
-- Fix duplicates and ensure all stores have consistent inventory

-- Step 1: Fix the "Coffee Beands" typo by consolidating with "Coffee Beans"
-- First, update any references to "Coffee Beands" to use "Coffee Beans"
UPDATE inventory_stock 
SET item = 'Coffee Beans'
WHERE item = 'Coffee Beands' AND is_active = true;

-- Step 2: Get the reference inventory from the most complete store (Sugbo Mercado)
-- Add missing items to all other stores based on Sugbo Mercado's inventory
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
    AND ist.item != 'Coffee Beands' -- Exclude the typo version
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
    -- Set reasonable starting quantities based on item type
    WHEN mi.item_category = 'packaging' THEN 100
    WHEN mi.item_category = 'base_ingredient' AND mi.unit IN ('ml', 'g', 'grams') THEN 1000
    WHEN mi.item_category = 'base_ingredient' AND mi.unit = 'pieces' THEN 50
    WHEN mi.item_category IN ('classic_sauce', 'premium_sauce') THEN 500
    WHEN mi.item_category IN ('classic_topping', 'premium_topping') THEN 200
    ELSE 50
  END as stock_quantity,
  COALESCE(mi.minimum_threshold, 10) as minimum_threshold,
  COALESCE(mi.cost, 0) as cost,
  true as is_active,
  true as recipe_compatible,
  NOW() as created_at,
  NOW() as updated_at
FROM missing_items mi;

-- Step 3: Clean up any remaining "Coffee Beands" entries that might exist
DELETE FROM inventory_stock 
WHERE item = 'Coffee Beands' AND is_active = true;

-- Step 4: Update recipe ingredient mappings to use "Coffee Beans" consistently
UPDATE recipe_ingredient_mappings 
SET ingredient_name = 'Coffee Beans',
    updated_at = NOW()
WHERE ingredient_name = 'Coffee Beands';

-- Step 5: Verify inventory standardization
WITH store_item_counts AS (
  SELECT 
    s.name as store_name,
    COUNT(ist.id) as item_count
  FROM stores s
  LEFT JOIN inventory_stock ist ON ist.store_id = s.id AND ist.is_active = true
  WHERE s.is_active = true
  GROUP BY s.id, s.name
),
standardization_check AS (
  SELECT 
    store_name,
    item_count,
    CASE 
      WHEN item_count = (SELECT MAX(item_count) FROM store_item_counts) THEN '✅ Standardized'
      ELSE '⚠️ Missing ' || ((SELECT MAX(item_count) FROM store_item_counts) - item_count) || ' items'
    END as status
  FROM store_item_counts
)
SELECT 
  'INVENTORY STANDARDIZATION COMPLETE' as result,
  json_agg(
    json_build_object(
      'store', store_name,
      'items', item_count,
      'status', status
    ) ORDER BY item_count DESC
  ) as store_status
FROM standardization_check;

-- Step 6: Show the final inventory summary
SELECT 
  'FINAL INVENTORY SUMMARY' as summary,
  COUNT(DISTINCT item) as total_unique_items,
  COUNT(DISTINCT store_id) as stores_processed,
  'All stores now have standardized inventory based on Sugbo Mercado reference' as message
FROM inventory_stock ist
JOIN stores s ON s.id = ist.store_id
WHERE ist.is_active = true AND s.is_active = true;