-- Create missing tables for the two-tier inventory system

-- Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    address text,
    lead_time_days integer DEFAULT 7,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create inventory_items table (for the existing inventory management system)
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL DEFAULT 'ingredients',
    current_stock numeric DEFAULT 0 NOT NULL,
    minimum_threshold numeric DEFAULT 0 NOT NULL,
    unit text NOT NULL,
    unit_cost numeric,
    supplier_id uuid REFERENCES public.suppliers(id),
    sku text,
    barcode text,
    expiry_date date,
    last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create recipes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL,
    variation_id uuid,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    yield_quantity numeric DEFAULT 1 NOT NULL,
    instructions text,
    version integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create recipe_ingredients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    inventory_stock_id uuid NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    order_number text NOT NULL UNIQUE,
    status text DEFAULT 'draft',
    total_amount numeric,
    created_by text NOT NULL,
    approved_by text,
    ordered_date date,
    expected_delivery_date date,
    received_date date,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity numeric NOT NULL,
    unit_cost numeric NOT NULL,
    total_cost numeric,
    received_quantity numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create purchase_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number text NOT NULL UNIQUE,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    supplier_id uuid REFERENCES public.suppliers(id),
    created_by text NOT NULL,
    approved_by text,
    status text DEFAULT 'draft',
    total_amount numeric DEFAULT 0,
    requested_delivery_date date,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    approved_at timestamp with time zone
);

-- Create purchase_order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    inventory_stock_id uuid NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
    quantity numeric NOT NULL,
    unit_price numeric,
    specifications text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create delivery_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.delivery_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_number text NOT NULL UNIQUE,
    purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    status text DEFAULT 'for_delivery',
    scheduled_delivery_date date,
    actual_delivery_date date,
    delivery_notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create goods_received_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.goods_received_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    grn_number text NOT NULL UNIQUE,
    delivery_order_id uuid REFERENCES public.delivery_orders(id),
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    received_by text NOT NULL,
    received_date date NOT NULL,
    status text DEFAULT 'pending',
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_items_store_id ON public.inventory_items(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name ON public.inventory_items(name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON public.inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active ON public.inventory_items(is_active);

CREATE INDEX IF NOT EXISTS idx_recipes_store_id ON public.recipes(store_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON public.recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_is_active ON public.recipes(is_active);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_inventory_stock_id ON public.recipe_ingredients(inventory_stock_id);

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON public.orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_inventory_item_id ON public.order_items(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_store_id ON public.purchase_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON public.purchase_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_inventory_stock_id ON public.purchase_order_items(inventory_stock_id);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_purchase_order_id ON public.delivery_orders(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_delivery_number ON public.delivery_orders(delivery_number);

CREATE INDEX IF NOT EXISTS idx_grn_store_id ON public.goods_received_notes(store_id);
CREATE INDEX IF NOT EXISTS idx_grn_delivery_order_id ON public.goods_received_notes(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_grn_status ON public.goods_received_notes(status);
CREATE INDEX IF NOT EXISTS idx_grn_grn_number ON public.goods_received_notes(grn_number);

-- Enable RLS for all new tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_received_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for suppliers (readable by all authenticated users, manageable by admins)
CREATE POLICY "Enable read access for authenticated users"
ON public.suppliers
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage suppliers"
ON public.suppliers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- Create RLS policies for inventory_items (store-based access)
CREATE POLICY "Enable read access for authenticated users"
ON public.inventory_items
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Store users can manage their inventory items"
ON public.inventory_items
FOR ALL
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
);

-- Create RLS policies for recipes (store-based access)
CREATE POLICY "Enable read access for authenticated users"
ON public.recipes
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Store users can manage their recipes"
ON public.recipes
FOR ALL
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
);

-- Create RLS policies for recipe_ingredients (accessible through recipes)
CREATE POLICY "Enable read access for authenticated users"
ON public.recipe_ingredients
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage recipe ingredients for their recipes"
ON public.recipe_ingredients
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.recipes r
      JOIN public.app_users au ON au.user_id = auth.uid()
      WHERE r.id = recipe_id
      AND (
        au.role IN ('admin', 'owner')
        OR r.store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  )
);

-- Create RLS policies for orders (store-based access)
CREATE POLICY "Enable read access for authenticated users"
ON public.orders
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Store users can manage their orders"
ON public.orders
FOR ALL
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
);

-- Create RLS policies for order_items (accessible through orders)
CREATE POLICY "Enable read access for authenticated users"
ON public.order_items
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage order items for their orders"
ON public.order_items
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.app_users au ON au.user_id = auth.uid()
      WHERE o.id = order_id
      AND (
        au.role IN ('admin', 'owner')
        OR o.store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  )
);

-- Create RLS policies for purchase_orders (store-based access)
CREATE POLICY "Enable read access for authenticated users"
ON public.purchase_orders
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Store users can manage their purchase orders"
ON public.purchase_orders
FOR ALL
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
);

-- Create RLS policies for purchase_order_items (accessible through purchase_orders)
CREATE POLICY "Enable read access for authenticated users"
ON public.purchase_order_items
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage purchase order items for their purchase orders"
ON public.purchase_order_items
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      JOIN public.app_users au ON au.user_id = auth.uid()
      WHERE po.id = purchase_order_id
      AND (
        au.role IN ('admin', 'owner')
        OR po.store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  )
);

-- Create RLS policies for delivery_orders (accessible through purchase_orders)
CREATE POLICY "Enable read access for authenticated users"
ON public.delivery_orders
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage delivery orders for their purchase orders"
ON public.delivery_orders
FOR ALL
USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      JOIN public.app_users au ON au.user_id = auth.uid()
      WHERE po.id = purchase_order_id
      AND (
        au.role IN ('admin', 'owner')
        OR po.store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  )
);

-- Create RLS policies for goods_received_notes (store-based access)
CREATE POLICY "Enable read access for authenticated users"
ON public.goods_received_notes
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Store users can manage their GRNs"
ON public.goods_received_notes
FOR ALL
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
);

-- Create updated_at triggers for new tables
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON public.inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at
    BEFORE UPDATE ON public.recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
    BEFORE UPDATE ON public.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_orders_updated_at
    BEFORE UPDATE ON public.delivery_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goods_received_notes_updated_at
    BEFORE UPDATE ON public.goods_received_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for all new tables
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
GRANT ALL ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
GRANT ALL ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
GRANT ALL ON public.recipe_ingredients TO authenticated;
GRANT ALL ON public.recipe_ingredients TO service_role;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;
GRANT ALL ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;
GRANT ALL ON public.delivery_orders TO authenticated;
GRANT ALL ON public.delivery_orders TO service_role;
GRANT ALL ON public.goods_received_notes TO authenticated;
GRANT ALL ON public.goods_received_notes TO service_role;

-- Insert sample suppliers
INSERT INTO public.suppliers (name, contact_person, email, phone, lead_time_days, is_active)
VALUES
    ('Premium Food Supplies', 'John Smith', 'john@premiumfood.com', '+1-555-0101', 3, true),
    ('Fresh Ingredients Co.', 'Sarah Johnson', 'sarah@freshingredients.com', '+1-555-0102', 2, true),
    ('Packaging Solutions Ltd.', 'Mike Brown', 'mike@packagingsolutions.com', '+1-555-0103', 5, true)
ON CONFLICT DO NOTHING;
