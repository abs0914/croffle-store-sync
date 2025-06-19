
-- Create a table to track commissary inventory purchases
CREATE TABLE public.commissary_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commissary_item_id UUID NOT NULL REFERENCES public.commissary_inventory(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity_purchased NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  batch_number TEXT,
  expiry_date DATE,
  invoice_number TEXT,
  notes TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for commissary_purchases
ALTER TABLE public.commissary_purchases ENABLE ROW LEVEL SECURITY;

-- Admin/Owner can manage all purchases
CREATE POLICY "Admin and owners can manage commissary purchases" 
  ON public.commissary_purchases 
  FOR ALL 
  USING (is_admin_or_owner());

-- Add indexes for better performance
CREATE INDEX idx_commissary_purchases_date ON public.commissary_purchases(purchase_date);
CREATE INDEX idx_commissary_purchases_item ON public.commissary_purchases(commissary_item_id);
CREATE INDEX idx_commissary_purchases_supplier ON public.commissary_purchases(supplier_id);

-- Add columns to commissary_inventory for better purchase tracking
ALTER TABLE public.commissary_inventory 
ADD COLUMN IF NOT EXISTS last_purchase_date DATE,
ADD COLUMN IF NOT EXISTS last_purchase_cost NUMERIC,
ADD COLUMN IF NOT EXISTS average_cost NUMERIC DEFAULT 0;

-- Create trigger to update commissary inventory when purchases are recorded
CREATE OR REPLACE FUNCTION update_commissary_inventory_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the commissary inventory stock and cost information
  UPDATE commissary_inventory 
  SET 
    current_stock = current_stock + NEW.quantity_purchased,
    last_purchase_date = NEW.purchase_date,
    last_purchase_cost = NEW.unit_cost,
    average_cost = CASE 
      WHEN current_stock + NEW.quantity_purchased > 0 THEN
        ((current_stock * COALESCE(unit_cost, 0)) + (NEW.quantity_purchased * NEW.unit_cost)) / 
        (current_stock + NEW.quantity_purchased)
      ELSE NEW.unit_cost
    END,
    unit_cost = NEW.unit_cost,
    updated_at = NOW()
  WHERE id = NEW.commissary_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase updates
DROP TRIGGER IF EXISTS commissary_purchase_update_trigger ON commissary_purchases;
CREATE TRIGGER commissary_purchase_update_trigger
  AFTER INSERT ON commissary_purchases
  FOR EACH ROW EXECUTE FUNCTION update_commissary_inventory_on_purchase();

-- Create function to get purchase history for an item
CREATE OR REPLACE FUNCTION get_commissary_purchase_history(item_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  purchase_date DATE,
  quantity_purchased NUMERIC,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  supplier_name TEXT,
  batch_number TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.purchase_date,
    cp.quantity_purchased,
    cp.unit_cost,
    cp.total_cost,
    s.name as supplier_name,
    cp.batch_number,
    cp.notes
  FROM commissary_purchases cp
  LEFT JOIN suppliers s ON cp.supplier_id = s.id
  WHERE cp.commissary_item_id = item_id
  ORDER BY cp.purchase_date DESC, cp.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
