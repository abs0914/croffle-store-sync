
-- First, drop the RLS policies that depend on delivery_order_id
DROP POLICY IF EXISTS "Users can view GRNs for their stores" ON goods_received_notes;
DROP POLICY IF EXISTS "Managers and above can manage GRNs in their stores" ON goods_received_notes;
DROP POLICY IF EXISTS "Users can view GRN items for their stores" ON grn_items;
DROP POLICY IF EXISTS "Managers and above can manage GRN items in their stores" ON grn_items;

-- Update the goods_received_notes table to reference purchase_orders directly
-- First, add the purchase_order_id column
ALTER TABLE goods_received_notes 
ADD COLUMN purchase_order_id uuid REFERENCES purchase_orders(id);

-- Update existing records to set purchase_order_id based on delivery_order relationships
UPDATE goods_received_notes 
SET purchase_order_id = (
  SELECT purchase_order_id 
  FROM delivery_orders 
  WHERE delivery_orders.id = goods_received_notes.delivery_order_id
)
WHERE delivery_order_id IS NOT NULL;

-- Make purchase_order_id NOT NULL after updating existing records
ALTER TABLE goods_received_notes 
ALTER COLUMN purchase_order_id SET NOT NULL;

-- Remove the old delivery_order_id column
ALTER TABLE goods_received_notes 
DROP COLUMN delivery_order_id;

-- Recreate RLS policies using purchase_order_id instead of delivery_order_id
CREATE POLICY "Users can view GRNs for their stores" ON goods_received_notes
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = goods_received_notes.purchase_order_id
      AND user_has_store_access(auth.uid(), po.store_id)
    )
  );

CREATE POLICY "Managers and above can manage GRNs in their stores" ON goods_received_notes
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = goods_received_notes.purchase_order_id
      AND user_has_store_access(auth.uid(), po.store_id)
    )
  );

CREATE POLICY "Users can view GRN items for their stores" ON grn_items
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM goods_received_notes grn
      JOIN purchase_orders po ON po.id = grn.purchase_order_id
      WHERE grn.id = grn_items.grn_id
      AND user_has_store_access(auth.uid(), po.store_id)
    )
  );

CREATE POLICY "Managers and above can manage GRN items in their stores" ON grn_items
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM goods_received_notes grn
      JOIN purchase_orders po ON po.id = grn.purchase_order_id
      WHERE grn.id = grn_items.grn_id
      AND user_has_store_access(auth.uid(), po.store_id)
    )
  );
