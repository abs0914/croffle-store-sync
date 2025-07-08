
-- Add new status values to the purchase_order_status enum
ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'replaced';
ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'refunded';

-- Create a table to track discrepancy resolutions
CREATE TABLE IF NOT EXISTS grn_discrepancy_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id uuid NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  resolution_type text NOT NULL CHECK (resolution_type IN ('replace', 'refund')),
  resolution_status text NOT NULL DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'approved', 'rejected', 'completed')),
  resolution_notes text,
  financial_adjustment numeric DEFAULT 0,
  processed_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Enable RLS on the new table
ALTER TABLE grn_discrepancy_resolutions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for discrepancy resolutions
CREATE POLICY "Users can view discrepancy resolutions for their stores" ON grn_discrepancy_resolutions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = grn_discrepancy_resolutions.purchase_order_id
      AND user_has_store_access(auth.uid(), po.store_id)
    )
  );

CREATE POLICY "Admins and managers can manage discrepancy resolutions" ON grn_discrepancy_resolutions
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = grn_discrepancy_resolutions.purchase_order_id
      AND user_has_store_access(auth.uid(), po.store_id)
    )
  );

-- Add trigger to update timestamp
CREATE OR REPLACE FUNCTION update_grn_discrepancy_resolutions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_grn_discrepancy_resolutions_updated_at
  BEFORE UPDATE ON grn_discrepancy_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION update_grn_discrepancy_resolutions_updated_at();
