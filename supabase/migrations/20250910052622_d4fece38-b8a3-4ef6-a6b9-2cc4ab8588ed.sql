-- Critical Ingredient-to-Inventory Mapping Fix (Simplified)
-- Map all unmapped recipe ingredients to their exact inventory matches
-- This addresses the core inventory deduction failure

BEGIN;

-- Execute the critical mapping update for exact matches
WITH ingredient_mappings AS (
  SELECT DISTINCT
    ri.id as recipe_ingredient_id,
    ist.id as inventory_stock_id
  FROM recipe_ingredients ri
  JOIN recipes r ON r.id = ri.recipe_id
  JOIN inventory_stock ist ON (
    LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
    AND ist.store_id = r.store_id
    AND ist.is_active = true
  )
  WHERE ri.inventory_stock_id IS NULL
)
UPDATE recipe_ingredients 
SET 
  inventory_stock_id = im.inventory_stock_id,
  updated_at = NOW()
FROM ingredient_mappings im
WHERE recipe_ingredients.id = im.recipe_ingredient_id;

COMMIT;

-- Verification queries
SELECT 
  'Mapping Success Rate' as metric,
  COUNT(*) FILTER (WHERE inventory_stock_id IS NOT NULL) as mapped_count,
  COUNT(*) FILTER (WHERE inventory_stock_id IS NULL) as unmapped_count,
  COUNT(*) as total_count,
  ROUND((COUNT(*) FILTER (WHERE inventory_stock_id IS NOT NULL)::numeric / COUNT(*)::numeric) * 100, 2) as success_percentage
FROM recipe_ingredients;

SELECT 
  'Critical Products Status' as metric,
  pc.product_name,
  COUNT(ri.id) as total_ingredients,
  COUNT(ri.inventory_stock_id) as mapped_ingredients,
  CASE 
    WHEN COUNT(ri.inventory_stock_id) = COUNT(ri.id) 
    THEN 'READY_FOR_DEDUCTION' 
    ELSE 'NEEDS_MAPPING' 
  END as deduction_status
FROM product_catalog pc
JOIN recipes r ON r.id = pc.recipe_id
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
WHERE pc.product_name IN ('Croffle Overload', 'Mini Croffle', 'Regular Croffle')
  AND pc.is_available = true
GROUP BY pc.product_name
ORDER BY pc.product_name;