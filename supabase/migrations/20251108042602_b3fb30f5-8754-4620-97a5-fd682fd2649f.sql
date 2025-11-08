
-- =====================================================
-- COMPREHENSIVE DATA CLEANUP AND INTEGRITY MIGRATION
-- Fixes: Duplicate recipe ingredients + Negative inventory
-- =====================================================

-- STEP 1: Clean up duplicate recipe ingredients
-- Keep only one entry per recipe_id + inventory_stock_id combination
WITH duplicates AS (
  SELECT 
    id,
    recipe_id,
    inventory_stock_id,
    ROW_NUMBER() OVER (
      PARTITION BY recipe_id, inventory_stock_id 
      ORDER BY created_at ASC
    ) as rn
  FROM recipe_ingredients
)
DELETE FROM recipe_ingredients
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- STEP 2: Reset all negative inventory quantities to 0
UPDATE inventory_stock
SET stock_quantity = 0,
    updated_at = NOW()
WHERE stock_quantity < 0;

-- STEP 3: Add unique constraint to prevent duplicate recipe ingredients
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_ingredients_unique 
ON recipe_ingredients(recipe_id, inventory_stock_id)
WHERE inventory_stock_id IS NOT NULL;

-- STEP 4: Add check constraint to prevent negative inventory
ALTER TABLE inventory_stock 
DROP CONSTRAINT IF EXISTS check_inventory_stock_quantity_non_negative;

ALTER TABLE inventory_stock 
ADD CONSTRAINT check_inventory_stock_quantity_non_negative 
CHECK (stock_quantity >= 0);

-- STEP 5: Add check constraint to prevent negative cost
ALTER TABLE inventory_stock 
DROP CONSTRAINT IF EXISTS check_inventory_stock_cost_non_negative;

ALTER TABLE inventory_stock 
ADD CONSTRAINT check_inventory_stock_cost_non_negative 
CHECK (cost >= 0);

-- Create cleanup audit log
CREATE TABLE IF NOT EXISTS data_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_type TEXT NOT NULL,
  affected_records INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log this cleanup operation
INSERT INTO data_cleanup_log (cleanup_type, affected_records, details)
VALUES (
  'recipe_ingredients_deduplication_and_inventory_reset',
  (SELECT COUNT(*) FROM recipe_ingredients) + 
  (SELECT COUNT(*) FROM inventory_stock WHERE stock_quantity = 0),
  jsonb_build_object(
    'migration_date', NOW(),
    'issues_fixed', jsonb_build_array(
      'Removed duplicate recipe ingredients',
      'Reset negative inventory to 0',
      'Added unique constraint on recipe_ingredients',
      'Added non-negative constraint on inventory stock'
    )
  )
);
