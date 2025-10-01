-- Phase 1: Database Query Optimization
-- Create optimized view for recipe ingredients by store
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
  r.name as recipe_name
FROM recipe_ingredients ri
INNER JOIN recipes r ON ri.recipe_id = r.id
LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
WHERE r.is_active = true;

-- Add composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_inventory 
ON recipe_ingredients(recipe_id, inventory_stock_id);

CREATE INDEX IF NOT EXISTS idx_recipes_store_template 
ON recipes(store_id, template_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_inventory_store_active 
ON inventory_stock(store_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_product_catalog_store_available 
ON product_catalog(store_id, is_available) WHERE is_available = true;

-- Add index for faster recipe ingredient lookups
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_store_lookup
ON recipe_ingredients(recipe_id) 
INCLUDE (inventory_stock_id, quantity, unit, cost_per_unit);

COMMENT ON VIEW recipe_ingredients_by_store IS 'Optimized view for fetching recipe ingredients filtered by store';
COMMENT ON INDEX idx_recipe_ingredients_recipe_inventory IS 'Composite index for recipe-inventory lookups';
COMMENT ON INDEX idx_recipes_store_template IS 'Index for active recipes by store';
COMMENT ON INDEX idx_inventory_store_active IS 'Index for active inventory by store';
COMMENT ON INDEX idx_product_catalog_store_available IS 'Index for available products by store';