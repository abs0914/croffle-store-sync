-- Phase 1: Data Migration - Populate missing inventory_stock_id references
-- First, try to populate missing inventory_stock_id using existing mappings
UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT rim.inventory_stock_id 
  FROM recipe_ingredient_mappings rim 
  WHERE rim.recipe_id = recipe_ingredients.recipe_id 
    AND LOWER(TRIM(rim.ingredient_name)) = LOWER(TRIM(recipe_ingredients.ingredient_name))
  LIMIT 1
)
WHERE inventory_stock_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim 
    WHERE rim.recipe_id = recipe_ingredients.recipe_id 
      AND LOWER(TRIM(rim.ingredient_name)) = LOWER(TRIM(recipe_ingredients.ingredient_name))
  );

-- For remaining unmapped ingredients, try exact name matching with inventory_stock
UPDATE recipe_ingredients 
SET inventory_stock_id = (
  SELECT ist.id 
  FROM inventory_stock ist 
  JOIN recipes r ON r.store_id = ist.store_id
  WHERE r.id = recipe_ingredients.recipe_id
    AND LOWER(TRIM(ist.item)) = LOWER(TRIM(recipe_ingredients.ingredient_name))
    AND ist.is_active = true
  LIMIT 1
)
WHERE inventory_stock_id IS NULL;

-- Phase 2: Clean up orphaned and invalid data
-- Remove recipe_ingredients that still don't have valid inventory_stock_id
-- (These are ingredients that couldn't be mapped to any inventory item)
DELETE FROM recipe_ingredients 
WHERE inventory_stock_id IS NULL 
   OR NOT EXISTS (
     SELECT 1 FROM inventory_stock ist 
     WHERE ist.id = recipe_ingredients.inventory_stock_id 
       AND ist.is_active = true
   );

-- Phase 3: Schema Changes
-- Make inventory_stock_id NOT NULL since every ingredient must be mapped
ALTER TABLE recipe_ingredients 
ALTER COLUMN inventory_stock_id SET NOT NULL;

-- Add foreign key constraint for data integrity
ALTER TABLE recipe_ingredients 
ADD CONSTRAINT fk_recipe_ingredients_inventory_stock 
FOREIGN KEY (inventory_stock_id) REFERENCES inventory_stock(id) 
ON DELETE CASCADE;

-- Remove the redundant ingredient_name column
-- (We'll derive this from inventory_stock.item via JOIN)
ALTER TABLE recipe_ingredients 
DROP COLUMN ingredient_name;

-- Phase 4: Drop the redundant mapping table entirely
-- All mapping is now handled by the direct FK relationship
DROP TABLE IF EXISTS recipe_ingredient_mappings;

-- Phase 5: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory_stock_id 
ON recipe_ingredients(inventory_stock_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id 
ON recipe_ingredients(recipe_id);

-- Phase 6: Update any views or functions that might reference the old schema
-- Create a view for backward compatibility if needed during transition
CREATE OR REPLACE VIEW recipe_ingredients_with_names AS
SELECT 
  ri.id,
  ri.recipe_id,
  ri.inventory_stock_id,
  ist.item as ingredient_name,
  ri.quantity,
  ri.unit,
  ri.cost_per_unit,
  ri.created_at,
  ri.updated_at,
  ist.store_id
FROM recipe_ingredients ri
JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
WHERE ist.is_active = true;