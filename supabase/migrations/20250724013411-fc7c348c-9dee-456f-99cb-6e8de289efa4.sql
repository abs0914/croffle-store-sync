-- Drop all triggers that depend on stock_quantity column
DROP TRIGGER IF EXISTS trigger_check_inventory_levels ON inventory_stock;
DROP TRIGGER IF EXISTS trigger_log_inventory_movement ON inventory_stock;

-- Update inventory_stock table to support decimal quantities
ALTER TABLE inventory_stock 
ALTER COLUMN stock_quantity TYPE NUMERIC;

-- Update any other quantity-related columns to support decimals
ALTER TABLE inventory_stock 
ALTER COLUMN minimum_threshold TYPE NUMERIC;

ALTER TABLE inventory_stock 
ALTER COLUMN maximum_capacity TYPE NUMERIC;

-- Update inventory_transactions table to support decimal quantities
ALTER TABLE inventory_transactions 
ALTER COLUMN quantity TYPE NUMERIC;

ALTER TABLE inventory_transactions 
ALTER COLUMN previous_quantity TYPE NUMERIC;

ALTER TABLE inventory_transactions 
ALTER COLUMN new_quantity TYPE NUMERIC;

-- Update inventory_movements table to support decimal quantities (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        EXECUTE 'ALTER TABLE inventory_movements ALTER COLUMN quantity_change TYPE NUMERIC';
        EXECUTE 'ALTER TABLE inventory_movements ALTER COLUMN previous_quantity TYPE NUMERIC';
        EXECUTE 'ALTER TABLE inventory_movements ALTER COLUMN new_quantity TYPE NUMERIC';
    END IF;
END $$;

-- Recreate the inventory check trigger to work with numeric values
CREATE OR REPLACE FUNCTION check_inventory_levels()
RETURNS TRIGGER AS $$
DECLARE
  low_stock_threshold NUMERIC := 10.0;
  reorder_threshold NUMERIC := 5.0;
BEGIN
  -- Delete existing alerts for this item
  DELETE FROM public.store_inventory_alerts 
  WHERE inventory_stock_id = NEW.id AND NOT is_acknowledged;
  
  -- Check for low stock
  IF NEW.stock_quantity <= low_stock_threshold AND NEW.stock_quantity > 0 THEN
    INSERT INTO public.store_inventory_alerts (
      store_id, inventory_stock_id, alert_type, threshold_quantity, current_quantity
    ) VALUES (
      NEW.store_id, NEW.id, 'low_stock', low_stock_threshold, NEW.stock_quantity
    );
  END IF;
  
  -- Check for out of stock
  IF NEW.stock_quantity <= 0 THEN
    INSERT INTO public.store_inventory_alerts (
      store_id, inventory_stock_id, alert_type, threshold_quantity, current_quantity
    ) VALUES (
      NEW.store_id, NEW.id, 'out_of_stock', 0, NEW.stock_quantity
    );
  END IF;
  
  -- Check for reorder point
  IF NEW.stock_quantity <= reorder_threshold THEN
    INSERT INTO public.store_inventory_alerts (
      store_id, inventory_stock_id, alert_type, threshold_quantity, current_quantity
    ) VALUES (
      NEW.store_id, NEW.id, 'reorder_point', reorder_threshold, NEW.stock_quantity
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the log inventory movement trigger to work with numeric values
CREATE OR REPLACE FUNCTION log_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if quantity actually changed
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    INSERT INTO public.inventory_movements (
      inventory_stock_id,
      movement_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      created_by,
      notes
    ) VALUES (
      NEW.id,
      'adjustment',
      NEW.stock_quantity - OLD.stock_quantity,
      OLD.stock_quantity,
      NEW.stock_quantity,
      auth.uid(),
      'Automatic inventory adjustment'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
CREATE TRIGGER trigger_check_inventory_levels
  AFTER INSERT OR UPDATE OF stock_quantity ON inventory_stock
  FOR EACH ROW
  EXECUTE FUNCTION check_inventory_levels();

CREATE TRIGGER trigger_log_inventory_movement
  AFTER UPDATE OF stock_quantity ON inventory_stock
  FOR EACH ROW
  EXECUTE FUNCTION log_inventory_movement();

-- Add comments to document the change
COMMENT ON COLUMN inventory_stock.stock_quantity IS 'Stock quantity supporting decimal values (e.g., 12.5 kg, 3.25 liters)';
COMMENT ON COLUMN inventory_stock.minimum_threshold IS 'Minimum threshold supporting decimal values';
COMMENT ON COLUMN inventory_stock.maximum_capacity IS 'Maximum capacity supporting decimal values';
COMMENT ON COLUMN inventory_transactions.quantity IS 'Transaction quantity supporting decimal values';
COMMENT ON COLUMN inventory_transactions.previous_quantity IS 'Previous quantity supporting decimal values';
COMMENT ON COLUMN inventory_transactions.new_quantity IS 'New quantity supporting decimal values';