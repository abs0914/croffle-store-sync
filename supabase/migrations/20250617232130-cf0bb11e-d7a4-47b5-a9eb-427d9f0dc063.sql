
-- First, clean up duplicate user_id entries in app_users table
-- Keep only the most recent entry for each user_id
DELETE FROM public.app_users 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM public.app_users 
    ORDER BY user_id, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.app_users ADD CONSTRAINT app_users_user_id_unique UNIQUE (user_id);

-- Create Product Catalog table
CREATE TABLE public.product_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Product Ingredients junction table
CREATE TABLE public.product_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_catalog_id UUID NOT NULL REFERENCES public.product_catalog(id) ON DELETE CASCADE,
  inventory_stock_id UUID NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
  commissary_item_id UUID REFERENCES public.commissary_inventory(id) ON DELETE SET NULL,
  required_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Stock Orders table
CREATE TABLE public.stock_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'pending', 'approved', 'fulfilled', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES public.app_users(user_id),
  approved_by UUID REFERENCES public.app_users(user_id),
  fulfilled_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Stock Order Items table
CREATE TABLE public.stock_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_order_id UUID NOT NULL REFERENCES public.stock_orders(id) ON DELETE CASCADE,
  inventory_stock_id UUID NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
  requested_quantity NUMERIC NOT NULL DEFAULT 0,
  approved_quantity NUMERIC DEFAULT 0,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add inventory tracking fields to inventory_stock table
ALTER TABLE public.inventory_stock 
ADD COLUMN IF NOT EXISTS minimum_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS maximum_capacity INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS last_restocked TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create indexes for performance
CREATE INDEX idx_product_catalog_store_id ON public.product_catalog(store_id);
CREATE INDEX idx_product_catalog_recipe_id ON public.product_catalog(recipe_id);
CREATE INDEX idx_product_ingredients_product_id ON public.product_ingredients(product_catalog_id);
CREATE INDEX idx_product_ingredients_inventory_id ON public.product_ingredients(inventory_stock_id);
CREATE INDEX idx_stock_orders_store_id ON public.stock_orders(store_id);
CREATE INDEX idx_stock_orders_status ON public.stock_orders(status);
CREATE INDEX idx_stock_order_items_order_id ON public.stock_order_items(stock_order_id);

-- Add RLS policies for product_catalog
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product catalog for their stores" 
  ON public.product_catalog 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE user_id = auth.uid() 
      AND (
        role IN ('admin', 'owner') 
        OR store_id = ANY(store_ids)
      )
    )
  );

CREATE POLICY "Managers and above can modify product catalog" 
  ON public.product_catalog 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE user_id = auth.uid() 
      AND (
        role IN ('admin', 'owner', 'manager') 
        AND (
          role IN ('admin', 'owner') 
          OR store_id = ANY(store_ids)
        )
      )
    )
  );

-- Add RLS policies for product_ingredients
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product ingredients for their stores" 
  ON public.product_ingredients 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.product_catalog pc
      JOIN public.app_users au ON (
        au.user_id = auth.uid() 
        AND (
          au.role IN ('admin', 'owner') 
          OR pc.store_id = ANY(au.store_ids)
        )
      )
      WHERE pc.id = product_catalog_id
    )
  );

CREATE POLICY "Managers and above can modify product ingredients" 
  ON public.product_ingredients 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.product_catalog pc
      JOIN public.app_users au ON (
        au.user_id = auth.uid() 
        AND au.role IN ('admin', 'owner', 'manager') 
        AND (
          au.role IN ('admin', 'owner') 
          OR pc.store_id = ANY(au.store_ids)
        )
      )
      WHERE pc.id = product_catalog_id
    )
  );

-- Add RLS policies for stock_orders
ALTER TABLE public.stock_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock orders for their stores" 
  ON public.stock_orders 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE user_id = auth.uid() 
      AND (
        role IN ('admin', 'owner') 
        OR store_id = ANY(store_ids)
      )
    )
  );

CREATE POLICY "Users can create stock orders for their stores" 
  ON public.stock_orders 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE user_id = auth.uid() 
      AND store_id = ANY(store_ids)
    )
  );

CREATE POLICY "Managers and above can modify stock orders" 
  ON public.stock_orders 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner', 'manager') 
      AND (
        role IN ('admin', 'owner') 
        OR store_id = ANY(store_ids)
      )
    )
  );

-- Add RLS policies for stock_order_items
ALTER TABLE public.stock_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock order items for their stores" 
  ON public.stock_order_items 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_orders so
      JOIN public.app_users au ON (
        au.user_id = auth.uid() 
        AND (
          au.role IN ('admin', 'owner') 
          OR so.store_id = ANY(au.store_ids)
        )
      )
      WHERE so.id = stock_order_id
    )
  );

CREATE POLICY "Users can modify stock order items for their orders" 
  ON public.stock_order_items 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_orders so
      JOIN public.app_users au ON (
        au.user_id = auth.uid() 
        AND (
          au.role IN ('admin', 'owner') 
          OR so.store_id = ANY(au.store_ids)
        )
      )
      WHERE so.id = stock_order_id
    )
  );

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_product_catalog_updated_at 
  BEFORE UPDATE ON public.product_catalog 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_orders_updated_at 
  BEFORE UPDATE ON public.stock_orders 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate stock order numbers
CREATE OR REPLACE FUNCTION public.generate_stock_order_number()
RETURNS TEXT AS $$
DECLARE
    order_count INTEGER;
    order_number TEXT;
BEGIN
    -- Get count of orders today
    SELECT COUNT(*) INTO order_count
    FROM public.stock_orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Generate order number: SO-YYYYMMDD-XXX
    order_number := 'SO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((order_count + 1)::TEXT, 3, '0');
    
    RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order numbers
CREATE OR REPLACE FUNCTION public.set_stock_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := public.generate_stock_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_stock_order_number_trigger
  BEFORE INSERT ON public.stock_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_stock_order_number();
