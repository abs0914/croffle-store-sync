
-- Phase 1: Extend inventory_stock schema for bulk-to-serving breakdown
ALTER TABLE inventory_stock 
ADD COLUMN bulk_unit TEXT,
ADD COLUMN bulk_quantity NUMERIC DEFAULT 0,
ADD COLUMN serving_unit TEXT,
ADD COLUMN serving_quantity NUMERIC DEFAULT 0,
ADD COLUMN breakdown_ratio NUMERIC DEFAULT 1,
ADD COLUMN cost_per_serving NUMERIC DEFAULT 0,
ADD COLUMN fractional_stock NUMERIC DEFAULT 0;

-- Update existing records to use current stock_quantity as serving_quantity
UPDATE inventory_stock 
SET serving_quantity = stock_quantity,
    serving_unit = unit,
    bulk_unit = unit,
    bulk_quantity = stock_quantity,
    breakdown_ratio = 1,
    cost_per_serving = COALESCE(cost, 0)
WHERE serving_quantity IS NULL;

-- Create function to calculate cost per serving automatically
CREATE OR REPLACE FUNCTION calculate_cost_per_serving()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate cost per serving based on bulk cost and breakdown ratio
  IF NEW.breakdown_ratio > 0 AND NEW.cost IS NOT NULL THEN
    NEW.cost_per_serving = NEW.cost / NEW.breakdown_ratio;
  END IF;
  
  -- Calculate serving quantity from bulk quantity
  IF NEW.bulk_quantity IS NOT NULL AND NEW.breakdown_ratio > 0 THEN
    NEW.serving_quantity = NEW.bulk_quantity * NEW.breakdown_ratio;
  END IF;
  
  -- Update stock_quantity to reflect total serving units (whole + fractional)
  NEW.stock_quantity = FLOOR(NEW.serving_quantity) + COALESCE(NEW.fractional_stock, 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate costs and quantities
CREATE TRIGGER update_serving_calculations
  BEFORE INSERT OR UPDATE ON inventory_stock
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cost_per_serving();

-- Add indexes for better performance on new columns
CREATE INDEX idx_inventory_stock_serving_unit ON inventory_stock(serving_unit);
CREATE INDEX idx_inventory_stock_bulk_unit ON inventory_stock(bulk_unit);

-- Create a view for easy serving-ready inventory access
CREATE OR REPLACE VIEW serving_ready_inventory AS
SELECT 
  id,
  store_id,
  item,
  serving_unit as unit,
  serving_quantity + COALESCE(fractional_stock, 0) as available_servings,
  cost_per_serving as unit_cost,
  minimum_threshold,
  maximum_capacity,
  is_active,
  created_at,
  updated_at
FROM inventory_stock
WHERE is_active = true;
