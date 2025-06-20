
-- Create commissary restock requests table
CREATE TABLE public.commissary_restock_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  commissary_item_id UUID NOT NULL REFERENCES public.commissary_inventory(id),
  requested_quantity NUMERIC NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  justification TEXT,
  requested_by UUID NOT NULL REFERENCES public.app_users(user_id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected')),
  approved_by UUID REFERENCES public.app_users(user_id),
  approved_quantity NUMERIC,
  fulfilled_by UUID REFERENCES public.app_users(user_id),
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commissary restock fulfillments table
CREATE TABLE public.commissary_restock_fulfillments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restock_request_id UUID NOT NULL REFERENCES public.commissary_restock_requests(id),
  commissary_item_id UUID NOT NULL REFERENCES public.commissary_inventory(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  quantity_transferred NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  fulfilled_by UUID NOT NULL REFERENCES public.app_users(user_id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RLS policies for commissary_restock_requests
ALTER TABLE public.commissary_restock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.commissary_restock_requests
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.commissary_restock_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.commissary_restock_requests
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create RLS policies for commissary_restock_fulfillments
ALTER TABLE public.commissary_restock_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.commissary_restock_fulfillments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.commissary_restock_fulfillments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create database function for transferring commissary to store inventory
CREATE OR REPLACE FUNCTION public.transfer_commissary_to_store(
  p_commissary_item_id UUID,
  p_store_id UUID,
  p_quantity NUMERIC,
  p_unit_cost NUMERIC,
  p_fulfilled_by UUID,
  p_notes TEXT DEFAULT 'Commissary transfer'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_commissary_stock NUMERIC;
  v_item_name TEXT;
  v_item_unit TEXT;
  v_inventory_stock_id UUID;
BEGIN
  -- Get commissary item details and check stock
  SELECT current_stock, name, unit 
  INTO v_commissary_stock, v_item_name, v_item_unit
  FROM commissary_inventory 
  WHERE id = p_commissary_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commissary item not found';
  END IF;
  
  IF v_commissary_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient commissary stock';
  END IF;
  
  -- Update commissary inventory
  UPDATE commissary_inventory 
  SET current_stock = current_stock - p_quantity,
      updated_at = NOW()
  WHERE id = p_commissary_item_id;
  
  -- Find or create inventory stock item in store
  SELECT id INTO v_inventory_stock_id
  FROM inventory_stock 
  WHERE store_id = p_store_id 
    AND item = v_item_name 
    AND unit = v_item_unit;
    
  IF v_inventory_stock_id IS NULL THEN
    -- Create new inventory stock item
    INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, cost, is_active)
    VALUES (p_store_id, v_item_name, v_item_unit, p_quantity, p_unit_cost, true)
    RETURNING id INTO v_inventory_stock_id;
  ELSE
    -- Update existing inventory stock
    UPDATE inventory_stock 
    SET stock_quantity = stock_quantity + p_quantity,
        cost = p_unit_cost,
        updated_at = NOW()
    WHERE id = v_inventory_stock_id;
  END IF;
  
  -- Log inventory transaction
  INSERT INTO inventory_transactions (
    store_id, product_id, transaction_type, quantity, 
    previous_quantity, new_quantity, created_by, notes
  )
  SELECT 
    p_store_id, 
    v_inventory_stock_id, 
    'commissary_transfer', 
    p_quantity, 
    COALESCE(stock_quantity - p_quantity, 0), 
    stock_quantity, 
    p_fulfilled_by, 
    p_notes
  FROM inventory_stock 
  WHERE id = v_inventory_stock_id;
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  RAISE;
  RETURN FALSE;
END;
$$;

-- Add update trigger for commissary_restock_requests
CREATE OR REPLACE FUNCTION public.update_commissary_restock_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_commissary_restock_requests_updated_at
  BEFORE UPDATE ON public.commissary_restock_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_commissary_restock_requests_updated_at();
