
-- This is a template SQL migration for creating the inventory_stock table
-- DO NOT RUN THIS DIRECTLY - use the Supabase SQL editor to create the table

-- Create inventory_stock table
CREATE TABLE public.inventory_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) NOT NULL,
  item TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  sku TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for faster queries
CREATE INDEX inventory_stock_store_id_idx ON public.inventory_stock(store_id);
CREATE INDEX inventory_stock_item_idx ON public.inventory_stock(item);

-- Add comment for documentation
COMMENT ON TABLE public.inventory_stock IS 'Stores inventory stock information for each store';

-- Add Row Level Security (RLS)
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing inventory_stock (users can only see items for stores they have access to)
CREATE POLICY "Users can view inventory stock for their stores" 
  ON public.inventory_stock 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stores us 
      WHERE us.store_id = inventory_stock.store_id AND us.user_id = auth.uid()
    )
  );

-- Create policy for inserting inventory_stock
CREATE POLICY "Users can add inventory stock for their stores" 
  ON public.inventory_stock 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_stores us 
      WHERE us.store_id = inventory_stock.store_id AND us.user_id = auth.uid()
    )
  );

-- Create policy for updating inventory_stock
CREATE POLICY "Users can update inventory stock for their stores" 
  ON public.inventory_stock 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stores us 
      WHERE us.store_id = inventory_stock.store_id AND us.user_id = auth.uid()
    )
  );

-- Create policy for deleting inventory_stock
CREATE POLICY "Users can delete inventory stock for their stores" 
  ON public.inventory_stock 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stores us 
      WHERE us.store_id = inventory_stock.store_id AND us.user_id = auth.uid()
    )
  );

-- Create inventory_transactions trigger to track stock changes
CREATE OR REPLACE FUNCTION public.log_inventory_stock_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    INSERT INTO public.inventory_transactions(
      store_id,
      product_id,
      transaction_type,
      quantity,
      previous_quantity,
      new_quantity,
      created_by,
      notes
    ) VALUES (
      NEW.store_id,
      NEW.id,
      'adjustment',
      ABS(NEW.stock_quantity - OLD.stock_quantity),
      OLD.stock_quantity,
      NEW.stock_quantity,
      auth.uid(),
      'System automated stock update'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_stock_changes
AFTER UPDATE ON public.inventory_stock
FOR EACH ROW
WHEN (OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity)
EXECUTE FUNCTION public.log_inventory_stock_changes();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock;
