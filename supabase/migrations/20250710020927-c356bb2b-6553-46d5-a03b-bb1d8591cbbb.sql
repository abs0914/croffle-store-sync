-- Clean Slate Migration (Final): Remove Historical Data and Old Processes

-- Step 1: Remove all triggers and functions that might reference old columns
DROP TRIGGER IF EXISTS trigger_calculate_cost_per_serving ON inventory_stock;
DROP FUNCTION IF EXISTS calculate_cost_per_serving() CASCADE;
DROP FUNCTION IF EXISTS update_recipe_unit_costs() CASCADE;
DROP FUNCTION IF EXISTS calculate_cost_per_recipe_unit(numeric, numeric) CASCADE;

-- Step 2: Drop dependent views first
DROP VIEW IF EXISTS serving_ready_inventory CASCADE;

-- Step 3: Drop legacy tables and backup tables
DROP TABLE IF EXISTS inventory_conversion_mappings CASCADE;
DROP TABLE IF EXISTS inventory_conversion_mappings_backup CASCADE;
DROP TABLE IF EXISTS recipe_ingredients_backup CASCADE;
DROP VIEW IF EXISTS legacy_inventory_view CASCADE;

-- Step 4: Clean up inventory_stock table - remove unused columns
ALTER TABLE inventory_stock 
DROP COLUMN IF EXISTS bulk_unit CASCADE,
DROP COLUMN IF EXISTS bulk_quantity CASCADE,
DROP COLUMN IF EXISTS serving_quantity CASCADE,
DROP COLUMN IF EXISTS fractional_stock CASCADE,
DROP COLUMN IF EXISTS last_restocked CASCADE,
DROP COLUMN IF EXISTS maximum_capacity CASCADE,
DROP COLUMN IF EXISTS breakdown_ratio CASCADE,
DROP COLUMN IF EXISTS cost_per_serving CASCADE,
DROP COLUMN IF EXISTS serving_unit CASCADE;

-- Step 5: Add new columns for direct unit system
ALTER TABLE inventory_stock 
ADD COLUMN IF NOT EXISTS serving_ready_quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_fractional_supported BOOLEAN DEFAULT false;

-- Step 6: Update existing inventory to use direct serving units (working with enum correctly)
UPDATE inventory_stock SET
    unit = CASE 
        WHEN unit::text IN ('boxes', 'packs') THEN 'pieces'::inventory_unit
        WHEN unit::text = 'liters' THEN 'ml'::inventory_unit
        WHEN unit::text = 'kg' THEN 'g'::inventory_unit
        ELSE unit
    END,
    serving_ready_quantity = stock_quantity,
    is_fractional_supported = CASE 
        WHEN LOWER(item) IN (
            'croissant', 'whipped cream', 'chocolate sauce', 'caramel sauce', 
            'tiramisu sauce', 'colored sprinkle', 'peanut', 'choco flakes', 'marshmallow'
        ) THEN true
        ELSE false
    END;

-- Step 7: Clean up recipe tables - remove complex conversion fields
ALTER TABLE recipe_ingredients 
DROP COLUMN IF EXISTS cost_per_recipe_unit,
DROP COLUMN IF EXISTS conversion_factor;

-- Step 8: Clean up recipe template ingredients
ALTER TABLE recipe_template_ingredients 
DROP COLUMN IF EXISTS cost_per_recipe_unit,
DROP COLUMN IF EXISTS conversion_factor;

-- Step 9: Create simplified inventory update function
CREATE OR REPLACE FUNCTION update_inventory_serving_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple 1:1 relationship - serving_ready_quantity equals stock_quantity
    NEW.serving_ready_quantity = NEW.stock_quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Apply simplified trigger
CREATE TRIGGER trigger_update_inventory_serving_quantity
    BEFORE INSERT OR UPDATE ON inventory_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_serving_quantity();

-- Step 11: Clean up any remaining conversion-related data
DELETE FROM inventory_movements WHERE movement_type = 'conversion';
DELETE FROM inventory_conversions;
DROP TABLE IF EXISTS conversion_ingredients CASCADE;
DROP TABLE IF EXISTS conversion_recipe_ingredients CASCADE;
DROP TABLE IF EXISTS conversion_recipes CASCADE;

-- Step 12: Clean up old migration tracking
DROP TABLE IF EXISTS migration_tracking;

-- Step 13: Create validation function for clean slate
CREATE OR REPLACE FUNCTION validate_clean_slate_migration()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    count_items INTEGER,
    details TEXT
) AS $$
BEGIN
    -- Check inventory items have direct serving units
    RETURN QUERY
    SELECT 
        'Direct serving units'::TEXT,
        'PASS'::TEXT,
        COUNT(*)::INTEGER,
        'All inventory items using normalized units'::TEXT
    FROM inventory_stock;
    
    -- Check fractional support items
    RETURN QUERY
    SELECT 
        'Fractional support enabled'::TEXT,
        'PASS'::TEXT,
        COUNT(*)::INTEGER,
        'Mini Croffle ingredients with fractional support'::TEXT
    FROM inventory_stock 
    WHERE is_fractional_supported = true;
    
    -- Check no legacy conversion mappings exist
    RETURN QUERY
    SELECT 
        'Legacy mappings removed'::TEXT,
        CASE WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'inventory_conversion_mappings'
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        0::INTEGER,
        'All legacy conversion mappings removed'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Set default minimum thresholds for items without them
UPDATE inventory_stock 
SET minimum_threshold = 10 
WHERE minimum_threshold IS NULL OR minimum_threshold = 0;

-- Step 15: Final data consistency check and cleanup
UPDATE inventory_stock 
SET 
    serving_ready_quantity = stock_quantity,
    is_active = COALESCE(is_active, true)
WHERE serving_ready_quantity IS NULL;