
-- Create store_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.store_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_order_value NUMERIC(10,2) DEFAULT 0,
  low_stock_items INTEGER DEFAULT 0,
  out_of_stock_items INTEGER DEFAULT 0,
  inventory_turnover NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, metric_date)
);

-- Enable RLS for store_metrics
ALTER TABLE public.store_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for store_metrics
CREATE POLICY "Users can view store metrics for their stores" 
  ON public.store_metrics 
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

CREATE POLICY "Managers and above can insert store metrics" 
  ON public.store_metrics 
  FOR INSERT 
  WITH CHECK (
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

CREATE POLICY "Managers and above can update store metrics" 
  ON public.store_metrics 
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

-- Insert sample data for the last 30 days for all stores
INSERT INTO public.store_metrics (store_id, metric_date, total_sales, total_orders, average_order_value, low_stock_items, out_of_stock_items, inventory_turnover)
SELECT 
  s.id as store_id,
  d.metric_date,
  ROUND((RANDOM() * 5000 + 1000)::numeric, 2) as total_sales,
  FLOOR(RANDOM() * 50 + 10)::integer as total_orders,
  ROUND((RANDOM() * 200 + 50)::numeric, 2) as average_order_value,
  FLOOR(RANDOM() * 10)::integer as low_stock_items,
  FLOOR(RANDOM() * 5)::integer as out_of_stock_items,
  ROUND((RANDOM() * 3 + 1)::numeric, 2) as inventory_turnover
FROM 
  public.stores s
CROSS JOIN 
  (SELECT CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 29) as metric_date) d
ON CONFLICT (store_id, metric_date) DO NOTHING;

-- Create trigger to automatically update store_metrics updated_at
CREATE OR REPLACE TRIGGER update_store_metrics_updated_at
  BEFORE UPDATE ON public.store_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
