
-- Fix remaining wrong store mappings with better matching logic
WITH mismatched_with_alternative AS (
  SELECT DISTINCT ON (ri.id)
    ri.id as ingredient_id,
    ist_correct.id as correct_inventory_id
  FROM recipe_ingredients ri
  JOIN recipes r ON r.id = ri.recipe_id
  JOIN inventory_stock ist_old ON ist_old.id = ri.inventory_stock_id
  JOIN inventory_stock ist_correct ON 
    lower(trim(ist_correct.item)) = lower(trim(ist_old.item))
    AND ist_correct.store_id = r.store_id
    AND ist_correct.is_active = true
  WHERE ist_old.store_id != r.store_id
  ORDER BY ri.id, ist_correct.stock_quantity DESC, ist_correct.created_at ASC
)
UPDATE recipe_ingredients ri
SET 
  inventory_stock_id = ma.correct_inventory_id,
  updated_at = now()
FROM mismatched_with_alternative ma
WHERE ri.id = ma.ingredient_id;
