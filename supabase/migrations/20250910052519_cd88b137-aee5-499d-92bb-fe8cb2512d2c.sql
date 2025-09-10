-- Comprehensive Ingredient-to-Inventory Mapping Fix
-- Phase 1: Map all unmapped recipe ingredients to their exact inventory matches
-- This addresses the critical inventory deduction failure identified in the analysis

BEGIN;

-- Create audit log for the mapping operation
CREATE TEMP TABLE mapping_audit_log AS
SELECT 
  ri.id as recipe_ingredient_id,
  ri.recipe_id,
  ri.ingredient_name,
  ri.unit,
  r.store_id,
  ist.id as inventory_stock_id,
  ist.item as inventory_item_name,
  NOW() as mapped_at
FROM recipe_ingredients ri
JOIN recipes r ON r.id = ri.recipe_id
JOIN inventory_stock ist ON (
  LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name))
  AND ist.store_id = r.store_id
  AND ist.is_active = true
)
WHERE ri.inventory_stock_id IS NULL;

-- Log the mapping operation details before execution
INSERT INTO public.bir_audit_logs (
  store_id,
  log_type,
  event_name,
  event_data,
  user_id,
  sequence_number,
  hash_value,
  created_at
)
SELECT 
  mal.store_id,
  'SYSTEM_OPERATION',
  'INGREDIENT_MAPPING_BATCH',
  jsonb_build_object(
    'action', 'bulk_ingredient_mapping',
    'ingredient_name', mal.ingredient_name,
    'recipe_count', COUNT(*),
    'inventory_item', mal.inventory_item_name,
    'mapping_type', 'exact_match'
  ),
  '00000000-0000-0000-0000-000000000000',
  (SELECT COALESCE(MAX(sequence_number), 0) + ROW_NUMBER() OVER (ORDER BY mal.store_id, mal.ingredient_name) 
   FROM bir_audit_logs WHERE store_id = mal.store_id),
  encode(digest(mal.store_id::text || mal.ingredient_name || NOW()::text, 'sha256'), 'hex'),
  NOW()
FROM mapping_audit_log mal
GROUP BY mal.store_id, mal.ingredient_name, mal.inventory_item_name;

-- Execute the critical mapping update
UPDATE recipe_ingredients 
SET 
  inventory_stock_id = mal.inventory_stock_id,
  updated_at = NOW()
FROM mapping_audit_log mal
WHERE recipe_ingredients.id = mal.recipe_ingredient_id;

-- Verify mapping success and log results
WITH mapping_results AS (
  SELECT 
    COUNT(*) FILTER (WHERE inventory_stock_id IS NOT NULL) as mapped_count,
    COUNT(*) FILTER (WHERE inventory_stock_id IS NULL) as unmapped_count,
    COUNT(*) as total_count
  FROM recipe_ingredients
)
INSERT INTO public.bir_audit_logs (
  store_id,
  log_type,
  event_name,
  event_data,
  user_id,
  sequence_number,
  hash_value,
  created_at
)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'SYSTEM_OPERATION',
  'INGREDIENT_MAPPING_COMPLETION',
  jsonb_build_object(
    'action', 'mapping_verification',
    'total_ingredients', mr.total_count,
    'mapped_ingredients', mr.mapped_count,
    'remaining_unmapped', mr.unmapped_count,
    'success_rate', ROUND((mr.mapped_count::numeric / mr.total_count::numeric) * 100, 2)
  ),
  '00000000-0000-0000-0000-000000000000',
  1,
  encode(digest('mapping_completion' || NOW()::text, 'sha256'), 'hex'),
  NOW()
FROM mapping_results mr;

COMMIT;

-- Post-migration verification queries
-- 1. Check mapping success rate
SELECT 
  'MAPPING_SUCCESS_RATE' as metric,
  COUNT(*) FILTER (WHERE inventory_stock_id IS NOT NULL) as mapped_count,
  COUNT(*) FILTER (WHERE inventory_stock_id IS NULL) as unmapped_count,
  COUNT(*) as total_count,
  ROUND((COUNT(*) FILTER (WHERE inventory_stock_id IS NOT NULL)::numeric / COUNT(*)::numeric) * 100, 2) as success_percentage
FROM recipe_ingredients;

-- 2. Verify critical ingredients are now mapped
SELECT 
  'CRITICAL_INGREDIENTS_STATUS' as metric,
  ri.ingredient_name,
  COUNT(*) as total_instances,
  COUNT(*) FILTER (WHERE ri.inventory_stock_id IS NOT NULL) as mapped_instances,
  CASE 
    WHEN COUNT(*) FILTER (WHERE ri.inventory_stock_id IS NOT NULL) = COUNT(*) 
    THEN 'FULLY_MAPPED' 
    ELSE 'PARTIALLY_MAPPED' 
  END as status
FROM recipe_ingredients ri
WHERE ri.ingredient_name IN ('Regular Croissant', 'Whipped Cream', 'Milk', 'Chopstick', 'Wax Paper')
GROUP BY ri.ingredient_name
ORDER BY total_instances DESC;

-- 3. Check inventory deduction readiness for high-volume products
SELECT 
  'INVENTORY_DEDUCTION_READINESS' as metric,
  pc.product_name,
  pc.store_id,
  COUNT(ri.id) as total_ingredients,
  COUNT(ri.inventory_stock_id) as mapped_ingredients,
  CASE 
    WHEN COUNT(ri.inventory_stock_id) = COUNT(ri.id) 
    THEN 'READY_FOR_DEDUCTION' 
    ELSE 'MAPPING_INCOMPLETE' 
  END as deduction_status
FROM product_catalog pc
JOIN recipes r ON r.id = pc.recipe_id
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
WHERE pc.product_name IN ('Croffle Overload', 'Mini Croffle', 'Regular Croffle')
  AND pc.is_available = true
GROUP BY pc.product_name, pc.store_id, pc.id
ORDER BY pc.product_name, pc.store_id;