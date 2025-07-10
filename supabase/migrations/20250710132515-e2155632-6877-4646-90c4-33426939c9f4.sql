-- Add conversion ratio and unit normalization fields to inventory tables

-- Add fields to inventory_stock for better unit management
ALTER TABLE inventory_stock 
ADD COLUMN IF NOT EXISTS order_unit TEXT,
ADD COLUMN IF NOT EXISTS order_quantity NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS conversion_ratio NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS normalized_unit TEXT,
ADD COLUMN IF NOT EXISTS is_fractional_supported BOOLEAN DEFAULT false;

-- Add fields to commissary_inventory for unit conversion tracking
ALTER TABLE commissary_inventory
ADD COLUMN IF NOT EXISTS order_unit TEXT,
ADD COLUMN IF NOT EXISTS order_quantity NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS serving_quantity NUMERIC,
ADD COLUMN IF NOT EXISTS conversion_ratio NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS normalized_unit TEXT;

-- Update inventory_stock to set normalized units for existing data
UPDATE inventory_stock 
SET normalized_unit = LOWER(TRIM(unit)),
    order_unit = unit,
    order_quantity = 1,
    conversion_ratio = 1
WHERE normalized_unit IS NULL;

-- Update commissary_inventory to set normalized units for existing data
UPDATE commissary_inventory 
SET normalized_unit = LOWER(TRIM(unit)),
    order_unit = unit,
    order_quantity = 1,
    serving_quantity = COALESCE(current_stock, 0),
    conversion_ratio = 1
WHERE normalized_unit IS NULL;

-- Create index for faster unit lookups
CREATE INDEX IF NOT EXISTS idx_inventory_stock_normalized_unit ON inventory_stock(normalized_unit);
CREATE INDEX IF NOT EXISTS idx_commissary_inventory_normalized_unit ON commissary_inventory(normalized_unit);

-- Create function to extract quantity from order unit descriptions
CREATE OR REPLACE FUNCTION extract_pack_quantity(order_description TEXT)
RETURNS NUMERIC AS $$
BEGIN
    -- Extract numbers from descriptions like "Pack of 20", "Packs of 25", "Pack of 100 pcs"
    RETURN COALESCE(
        (regexp_match(order_description, 'Pack(?:s)? of (\d+)', 'i'))[1]::NUMERIC,
        (regexp_match(order_description, '(\d+)pcs', 'i'))[1]::NUMERIC,
        (regexp_match(order_description, '(\d+) piping bag', 'i'))[1]::NUMERIC,
        1
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to normalize unit names
CREATE OR REPLACE FUNCTION normalize_unit_name(unit_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Normalize common unit variations
    RETURN CASE 
        WHEN LOWER(TRIM(unit_text)) IN ('pieces', 'piece', 'pcs', 'pc') THEN 'pieces'
        WHEN LOWER(TRIM(unit_text)) IN ('serving', 'servings') THEN 'serving'
        WHEN LOWER(TRIM(unit_text)) IN ('portion', 'portions') THEN 'portion'
        WHEN LOWER(TRIM(unit_text)) IN ('scoop', 'scoops') THEN 'scoop'
        WHEN LOWER(TRIM(unit_text)) IN ('box', 'boxes') THEN 'box'
        WHEN LOWER(TRIM(unit_text)) IN ('pack', 'packs') THEN 'pack'
        WHEN LOWER(TRIM(unit_text)) IN ('kg', 'kilogram', 'kilograms') THEN 'kg'
        WHEN LOWER(TRIM(unit_text)) IN ('g', 'gram', 'grams') THEN 'g'
        WHEN LOWER(TRIM(unit_text)) IN ('liter', 'liters', 'l') THEN 'liters'
        WHEN LOWER(TRIM(unit_text)) IN ('ml', 'milliliter', 'milliliters') THEN 'ml'
        ELSE LOWER(TRIM(unit_text))
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;