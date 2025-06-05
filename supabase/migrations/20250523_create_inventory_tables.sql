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

-- Create commissary_inventory table for admin-level raw materials
CREATE TABLE IF NOT EXISTS public.commissary_inventory (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    category text NOT NULL DEFAULT 'raw_materials',
    current_stock numeric DEFAULT 0 NOT NULL,
    minimum_threshold numeric DEFAULT 0 NOT NULL,
    unit text NOT NULL,
    unit_cost numeric,
    supplier_id uuid REFERENCES public.suppliers(id),
    sku text,
    barcode text,
    expiry_date date,
    storage_location text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create inventory_conversions table to track raw material to finished goods conversions
CREATE TABLE IF NOT EXISTS public.inventory_conversions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    commissary_item_id uuid NOT NULL REFERENCES public.commissary_inventory(id) ON DELETE CASCADE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    inventory_stock_id uuid NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
    raw_material_quantity numeric NOT NULL,
    finished_goods_quantity numeric NOT NULL,
    conversion_ratio numeric NOT NULL, -- finished_goods_quantity / raw_material_quantity
    conversion_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    converted_by text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for commissary_inventory
CREATE INDEX IF NOT EXISTS idx_commissary_inventory_name ON public.commissary_inventory(name);
CREATE INDEX IF NOT EXISTS idx_commissary_inventory_category ON public.commissary_inventory(category);
CREATE INDEX IF NOT EXISTS idx_commissary_inventory_is_active ON public.commissary_inventory(is_active);
CREATE INDEX IF NOT EXISTS idx_commissary_inventory_supplier ON public.commissary_inventory(supplier_id);

-- Create indexes for inventory_conversions
CREATE INDEX IF NOT EXISTS idx_inventory_conversions_commissary_item ON public.inventory_conversions(commissary_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_conversions_store ON public.inventory_conversions(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_conversions_inventory_stock ON public.inventory_conversions(inventory_stock_id);
CREATE INDEX IF NOT EXISTS idx_inventory_conversions_date ON public.inventory_conversions(conversion_date);

-- Enable RLS for new tables
ALTER TABLE public.commissary_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_conversions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for commissary_inventory (admin-only access)
CREATE POLICY "Admins can read commissary inventory"
ON public.commissary_inventory
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

CREATE POLICY "Admins can manage commissary inventory"
ON public.commissary_inventory
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- Create RLS policies for inventory_conversions
CREATE POLICY "Admins can read all conversions"
ON public.inventory_conversions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

CREATE POLICY "Store users can read their conversions"
ON public.inventory_conversions
FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.user_id = auth.uid()
      AND store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "Admins can manage conversions"
ON public.inventory_conversions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_commissary_inventory_updated_at
    BEFORE UPDATE ON public.commissary_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for new tables
GRANT ALL ON public.commissary_inventory TO authenticated;
GRANT ALL ON public.commissary_inventory TO service_role;
GRANT ALL ON public.inventory_conversions TO authenticated;
GRANT ALL ON public.inventory_conversions TO service_role;

-- Insert sample commissary inventory items
INSERT INTO public.commissary_inventory (name, category, current_stock, minimum_threshold, unit, unit_cost, is_active)
VALUES
    ('Raw Caramel Syrup', 'raw_materials', 100, 20, 'liters', 15.50, true),
    ('Cocoa Powder', 'raw_materials', 50, 10, 'kg', 25.00, true),
    ('Biscoff Cookie Base', 'raw_materials', 200, 50, 'kg', 12.75, true),
    ('Vanilla Extract', 'raw_materials', 25, 5, 'liters', 45.00, true),
    ('Heavy Cream', 'raw_materials', 80, 15, 'liters', 8.50, true)
ON CONFLICT DO NOTHING;

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
