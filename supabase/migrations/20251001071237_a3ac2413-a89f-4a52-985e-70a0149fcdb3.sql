-- Fix slow recipe ingredients query by optimizing the view
-- The previous view was doing an unfiltered LEFT JOIN which caused table scans

-- Drop the old view
DROP VIEW IF EXISTS recipe_ingredients_by_store;

-- Create optimized view with better JOIN conditions
-- This pre-filters inventory_stock in the JOIN for better performance
CREATE OR REPLACE VIEW recipe_ingredients_by_store AS
SELECT 
  ri.id,
  ri.recipe_id,
  ri.inventory_stock_id,
  ri.quantity,
  ri.unit,
  ri.cost_per_unit,
  ri.created_at,
  ri.updated_at,
  ist.item as ingredient_name,
  ist.store_id,
  ist.stock_quantity,
  ist.is_active as inventory_active,
  r.name as recipe_name,
  r.is_active as recipe_active,
  r.store_id as recipe_store_id
FROM recipe_ingredients ri
INNER JOIN recipes r ON ri.recipe_id = r.id
LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id AND ist.is_active = true
WHERE r.is_active = true;

-- Add index specifically for store_id filtering on the view's underlying tables
CREATE INDEX IF NOT EXISTS idx_inventory_stock_id_store 
ON inventory_stock(id, store_id, is_active) WHERE is_active = true;

-- Add index for recipes by store
CREATE INDEX IF NOT EXISTS idx_recipes_id_store 
ON recipes(id, store_id, is_active) WHERE is_active = true;

-- Add covering index for recipe_ingredients with all needed fields
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_covering
ON recipe_ingredients(recipe_id, inventory_stock_id) 
INCLUDE (quantity, unit, cost_per_unit);

COMMENT ON VIEW recipe_ingredients_by_store IS 'Optimized view v2: Pre-filters inventory_stock in JOIN for better performance';