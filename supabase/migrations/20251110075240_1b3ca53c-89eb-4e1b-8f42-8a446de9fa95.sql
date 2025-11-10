
-- Step 1: Delete duplicate recipe ingredients that point to wrong stores
-- Keep only ingredients from the correct store
WITH duplicate_ingredients AS (
  SELECT 
    ri.id as ingredient_id,
    ri.recipe_id,
    r.store_id as recipe_store_id,
    ist.item,
    ist.store_id as item_store_id,
    ROW_NUMBER() OVER (
      PARTITION BY ri.recipe_id, lower(trim(ist.item))
      ORDER BY 
        CASE WHEN ist.store_id = r.store_id THEN 0 ELSE 1 END, -- Prefer correct store
        ist.stock_quantity DESC, -- Prefer items with more stock
        ri.created_at ASC -- Keep older entries
    ) as rn
  FROM recipe_ingredients ri
  JOIN recipes r ON r.id = ri.recipe_id
  JOIN inventory_stock ist ON ist.id = ri.inventory_stock_id
)
DELETE FROM recipe_ingredients
WHERE id IN (
  SELECT ingredient_id 
  FROM duplicate_ingredients 
  WHERE rn > 1 -- Delete duplicates, keep first one (best match)
);

-- Step 2: Update remaining recipe ingredients to point to correct store inventory
WITH mismatched_ingredients AS (
  SELECT 
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
  ORDER BY ist_correct.stock_quantity DESC
  LIMIT 1 -- Take the one with most stock if multiple exist
)
UPDATE recipe_ingredients
SET 
  inventory_stock_id = mi.correct_inventory_id,
  updated_at = now()
FROM mismatched_ingredients mi
WHERE recipe_ingredients.id = mi.ingredient_id;
