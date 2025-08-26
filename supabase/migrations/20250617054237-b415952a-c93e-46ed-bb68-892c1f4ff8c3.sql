
-- Add store-specific inventory tracking enhancements
CREATE TABLE IF NOT EXISTS public.store_inventory_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  inventory_stock_id UUID NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'reorder_point')),
  threshold_quantity INTEGER NOT NULL,
  current_quantity INTEGER NOT NULL,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add order status tracking enhancements
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'completed' CHECK (order_status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'));

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS estimated_completion_time TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS order_notes TEXT;

-- Create order status history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create store performance metrics table
CREATE TABLE IF NOT EXISTS public.store_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  inventory_turnover DECIMAL(5,2) DEFAULT 0,
  low_stock_items INTEGER DEFAULT 0,
  out_of_stock_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, metric_date)
);

-- Add inventory movement tracking
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_stock_id UUID NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('sale', 'adjustment', 'transfer_in', 'transfer_out', 'restock', 'damage', 'expire')),
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to automatically create inventory alerts
CREATE OR REPLACE FUNCTION public.check_inventory_levels()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  low_stock_threshold INTEGER := 10;
  reorder_threshold INTEGER := 5;
BEGIN
  -- Delete existing alerts for this item
  DELETE FROM public.store_inventory_alerts 
  WHERE inventory_stock_id = NEW.id AND NOT is_acknowledged;
  
  -- Check for low stock
  IF NEW.stock_quantity <= low_stock_threshold AND NEW.stock_quantity > 0 THEN
    INSERT INTO public.store_inventory_alerts (
      store_id, inventory_stock_id, alert_type, threshold_quantity, current_quantity
    ) VALUES (
      NEW.store_id, NEW.id, 'low_stock', low_stock_threshold, NEW.stock_quantity
    );
  END IF;
  
  -- Check for out of stock
  IF NEW.stock_quantity <= 0 THEN
    INSERT INTO public.store_inventory_alerts (
      store_id, inventory_stock_id, alert_type, threshold_quantity, current_quantity
    ) VALUES (
      NEW.store_id, NEW.id, 'out_of_stock', 0, NEW.stock_quantity
    );
  END IF;
  
  -- Check for reorder point
  IF NEW.stock_quantity <= reorder_threshold THEN
    INSERT INTO public.store_inventory_alerts (
      store_id, inventory_stock_id, alert_type, threshold_quantity, current_quantity
    ) VALUES (
      NEW.store_id, NEW.id, 'reorder_point', reorder_threshold, NEW.stock_quantity
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for inventory alerts
DROP TRIGGER IF EXISTS trigger_check_inventory_levels ON public.inventory_stock;
CREATE TRIGGER trigger_check_inventory_levels
  AFTER UPDATE OF stock_quantity ON public.inventory_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.check_inventory_levels();

-- Create function to log inventory movements
CREATE OR REPLACE FUNCTION public.log_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if quantity actually changed
  IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
    INSERT INTO public.inventory_movements (
      inventory_stock_id,
      movement_type,
      quantity_change,
      previous_quantity,
      new_quantity,
      created_by,
      notes
    ) VALUES (
      NEW.id,
      'adjustment',
      NEW.stock_quantity - OLD.stock_quantity,
      OLD.stock_quantity,
      NEW.stock_quantity,
      auth.uid(),
      'Automatic inventory adjustment'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for inventory movements
DROP TRIGGER IF EXISTS trigger_log_inventory_movement ON public.inventory_stock;
CREATE TRIGGER trigger_log_inventory_movement
  AFTER UPDATE OF stock_quantity ON public.inventory_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_movement();

-- Create function to update store metrics
CREATE OR REPLACE FUNCTION public.update_store_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  metric_date DATE := CURRENT_DATE;
BEGIN
  -- Update or insert daily metrics
  INSERT INTO public.store_metrics (
    store_id, metric_date, total_sales, total_orders, average_order_value
  )
  SELECT 
    NEW.store_id,
    metric_date,
    COALESCE(SUM(total), 0),
    COUNT(*),
    COALESCE(AVG(total), 0)
  FROM public.transactions 
  WHERE store_id = NEW.store_id 
    AND DATE(created_at) = metric_date
    AND status = 'completed'
  ON CONFLICT (store_id, metric_date) 
  DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_orders = EXCLUDED.total_orders,
    average_order_value = EXCLUDED.average_order_value,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;

-- Create trigger for store metrics
DROP TRIGGER IF EXISTS trigger_update_store_metrics ON public.transactions;
CREATE TRIGGER trigger_update_store_metrics
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_metrics();

-- Add RLS policies for new tables
ALTER TABLE public.store_inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for store_inventory_alerts
CREATE POLICY "Users can view alerts for their stores" ON public.store_inventory_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.user_id = auth.uid()
      AND (
        au.role IN ('admin', 'owner') OR
        store_id = ANY(au.store_ids)
      )
    )
  );

CREATE POLICY "Users can update alerts for their stores" ON public.store_inventory_alerts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.user_id = auth.uid()
      AND (
        au.role IN ('admin', 'owner') OR
        store_id = ANY(au.store_ids)
      )
    )
  );

-- RLS policies for order_status_history
CREATE POLICY "Users can view order history for their stores" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.app_users au ON au.user_id = auth.uid()
      WHERE t.id = transaction_id
      AND (
        au.role IN ('admin', 'owner') OR
        t.store_id = ANY(au.store_ids)
      )
    )
  );

CREATE POLICY "Users can insert order history for their stores" ON public.order_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.app_users au ON au.user_id = auth.uid()
      WHERE t.id = transaction_id
      AND (
        au.role IN ('admin', 'owner') OR
        t.store_id = ANY(au.store_ids)
      )
    )
  );

-- RLS policies for store_metrics
CREATE POLICY "Users can view metrics for their stores" ON public.store_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.app_users au
      WHERE au.user_id = auth.uid()
      AND (
        au.role IN ('admin', 'owner') OR
        store_id = ANY(au.store_ids)
      )
    )
  );

-- RLS policies for inventory_movements
CREATE POLICY "Users can view movements for their stores" ON public.inventory_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.inventory_stock ist
      JOIN public.app_users au ON au.user_id = auth.uid()
      WHERE ist.id = inventory_stock_id
      AND (
        au.role IN ('admin', 'owner') OR
        ist.store_id = ANY(au.store_ids)
      )
    )
  );

CREATE POLICY "Users can insert movements for their stores" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_stock ist
      JOIN public.app_users au ON au.user_id = auth.uid()
      WHERE ist.id = inventory_stock_id
      AND (
        au.role IN ('admin', 'owner') OR
        ist.store_id = ANY(au.store_ids)
      )
    )
  );
