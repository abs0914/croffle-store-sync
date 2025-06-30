
-- First, let's identify and remove duplicate GRNs, keeping only the latest one for each purchase order
WITH duplicate_grns AS (
  SELECT id, purchase_order_id,
         ROW_NUMBER() OVER (PARTITION BY purchase_order_id ORDER BY created_at DESC) as rn
  FROM goods_received_notes
)
DELETE FROM goods_received_notes 
WHERE id IN (
  SELECT id FROM duplicate_grns WHERE rn > 1
);

-- Now add the unique constraint to prevent future duplicates
ALTER TABLE goods_received_notes 
ADD CONSTRAINT unique_grn_per_purchase_order 
UNIQUE (purchase_order_id);

-- Remove the status column from goods_received_notes since GRNs will be automatically completed
ALTER TABLE goods_received_notes 
DROP COLUMN IF EXISTS status;

-- Add a function to automatically update purchase order status when GRN is created
CREATE OR REPLACE FUNCTION update_purchase_order_on_grn_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the purchase order status to completed when GRN is created
  UPDATE purchase_orders 
  SET status = 'completed'::purchase_order_status,
      updated_at = NOW()
  WHERE id = NEW.purchase_order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update purchase order status
DROP TRIGGER IF EXISTS trigger_update_purchase_order_on_grn ON goods_received_notes;
CREATE TRIGGER trigger_update_purchase_order_on_grn
  AFTER INSERT ON goods_received_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_on_grn_creation();
