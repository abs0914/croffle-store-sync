-- Create inventory_stock table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    item text NOT NULL,
    sku text,
    unit text NOT NULL,
    stock_quantity numeric DEFAULT 0 NOT NULL,
    cost numeric,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create inventory_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    transaction_type text NOT NULL,
    quantity numeric NOT NULL,
    previous_quantity numeric NOT NULL,
    new_quantity numeric NOT NULL,
    reference_id uuid,
    variation_id uuid,
    created_by text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_stock_store_id ON public.inventory_stock(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_item ON public.inventory_stock(item);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_is_active ON public.inventory_stock(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_store_item ON public.inventory_stock(store_id, item);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON public.inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_store_id ON public.inventory_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON public.inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON public.inventory_transactions(created_at);

-- Enable RLS
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_stock
CREATE POLICY "Enable read access for authenticated users" 
ON public.inventory_stock
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users with store access" 
ON public.inventory_stock
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.app_users au 
      WHERE au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  )
);

CREATE POLICY "Enable update for authenticated users with store access" 
ON public.inventory_stock
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.app_users au 
      WHERE au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.app_users au 
      WHERE au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  )
);

CREATE POLICY "Enable delete for admins and owners" 
ON public.inventory_stock
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- Create RLS policies for inventory_transactions
CREATE POLICY "Enable read access for authenticated users" 
ON public.inventory_transactions
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users with store access" 
ON public.inventory_transactions
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.app_users au 
      WHERE au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  )
);

-- Create updated_at trigger for inventory_stock
CREATE TRIGGER update_inventory_stock_updated_at 
    BEFORE UPDATE ON public.inventory_stock 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.inventory_stock TO authenticated;
GRANT ALL ON public.inventory_stock TO service_role;
GRANT ALL ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;

-- Insert sample inventory items if none exist
INSERT INTO public.inventory_stock (store_id, item, unit, stock_quantity, is_active)
SELECT 
    s.id,
    'Caramel',
    'Portion',
    20,
    true
FROM public.stores s
WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_stock 
    WHERE item = 'Caramel' AND store_id = s.id
);

INSERT INTO public.inventory_stock (store_id, item, unit, stock_quantity, is_active)
SELECT 
    s.id,
    'Chocolate',
    'Portion',
    20,
    true
FROM public.stores s
WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_stock 
    WHERE item = 'Chocolate' AND store_id = s.id
);

INSERT INTO public.inventory_stock (store_id, item, unit, stock_quantity, is_active)
SELECT 
    s.id,
    'Biscoff',
    'Pack of 32',
    20,
    true
FROM public.stores s
WHERE NOT EXISTS (
    SELECT 1 FROM public.inventory_stock 
    WHERE item = 'Biscoff' AND store_id = s.id
);
