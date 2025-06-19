
-- Add location classification to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS location_type TEXT CHECK (location_type IN ('inside_cebu', 'outside_cebu')) DEFAULT 'inside_cebu',
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS logistics_zone TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost_multiplier NUMERIC DEFAULT 1.0;

-- Create location-based pricing table
CREATE TABLE public.location_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commissary_item_id UUID NOT NULL REFERENCES public.commissary_inventory(id),
  location_type TEXT NOT NULL CHECK (location_type IN ('inside_cebu', 'outside_cebu')),
  base_price NUMERIC NOT NULL DEFAULT 0,
  markup_percentage NUMERIC DEFAULT 0,
  minimum_order_quantity NUMERIC DEFAULT 1,
  shipping_cost NUMERIC DEFAULT 0,
  lead_time_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(commissary_item_id, location_type)
);

-- Add RLS policies for location_pricing
ALTER TABLE public.location_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and owners can manage location pricing" 
  ON public.location_pricing 
  FOR ALL 
  USING (is_admin_or_owner());

-- Create location-based supplier assignments
CREATE TABLE public.regional_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  location_type TEXT NOT NULL CHECK (location_type IN ('inside_cebu', 'outside_cebu')),
  priority INTEGER DEFAULT 1,
  is_preferred BOOLEAN DEFAULT false,
  shipping_cost NUMERIC DEFAULT 0,
  lead_time_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, location_type)
);

ALTER TABLE public.regional_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and owners can manage regional suppliers" 
  ON public.regional_suppliers 
  FOR ALL 
  USING (is_admin_or_owner());

-- Add location context to purchase orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS location_type TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS logistics_notes TEXT;

-- Update existing stores to have location type
UPDATE public.stores 
SET location_type = 'inside_cebu', 
    region = 'Cebu', 
    logistics_zone = 'Metro Cebu'
WHERE location_type IS NULL;

-- Add indexes for performance
CREATE INDEX idx_location_pricing_item_location ON public.location_pricing(commissary_item_id, location_type);
CREATE INDEX idx_regional_suppliers_location ON public.regional_suppliers(location_type, priority);
CREATE INDEX idx_stores_location_type ON public.stores(location_type);

-- Create function to get location-specific pricing
CREATE OR REPLACE FUNCTION get_location_pricing(item_id UUID, store_location TEXT)
RETURNS TABLE(
  base_price NUMERIC,
  markup_percentage NUMERIC,
  final_price NUMERIC,
  minimum_order_quantity NUMERIC,
  shipping_cost NUMERIC,
  lead_time_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lp.base_price,
    lp.markup_percentage,
    lp.base_price * (1 + COALESCE(lp.markup_percentage, 0) / 100) as final_price,
    lp.minimum_order_quantity,
    lp.shipping_cost,
    lp.lead_time_days
  FROM location_pricing lp
  WHERE lp.commissary_item_id = item_id 
    AND lp.location_type = store_location
    AND lp.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get preferred suppliers by location
CREATE OR REPLACE FUNCTION get_location_suppliers(store_location TEXT)
RETURNS TABLE(
  supplier_id UUID,
  supplier_name TEXT,
  priority INTEGER,
  is_preferred BOOLEAN,
  shipping_cost NUMERIC,
  lead_time_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as supplier_id,
    s.name as supplier_name,
    rs.priority,
    rs.is_preferred,
    rs.shipping_cost,
    rs.lead_time_days
  FROM suppliers s
  INNER JOIN regional_suppliers rs ON s.id = rs.supplier_id
  WHERE rs.location_type = store_location
    AND s.is_active = true
  ORDER BY rs.is_preferred DESC, rs.priority ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
