
-- Create product bundles table to handle complex products like "REGULAR CROISSANT + WHIPPED CREAM"
CREATE TABLE public.product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_price NUMERIC NOT NULL DEFAULT 0,
  unit_description TEXT, -- e.g., "1 box/70pcs. and 7 piping bag whipped cream"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product bundle components to define what items make up a bundle
CREATE TABLE public.product_bundle_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.product_bundles(id) ON DELETE CASCADE,
  commissary_item_id UUID NOT NULL REFERENCES public.commissary_inventory(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhance conversion mappings to support bundle awareness
ALTER TABLE public.inventory_conversion_mappings 
ADD COLUMN bundle_id UUID REFERENCES public.product_bundles(id) ON DELETE CASCADE,
ADD COLUMN is_bundle_component BOOLEAN DEFAULT false,
ADD COLUMN component_ratio NUMERIC DEFAULT 1; -- For proportional deduction from bundles

-- Add indexes for performance
CREATE INDEX idx_product_bundles_name ON public.product_bundles(name);
CREATE INDEX idx_bundle_components_bundle ON public.product_bundle_components(bundle_id);
CREATE INDEX idx_conversion_mappings_bundle ON public.inventory_conversion_mappings(bundle_id);

-- Add RLS policies for product bundles
ALTER TABLE public.product_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view product bundles" 
  ON public.product_bundles 
  FOR SELECT 
  USING (true); -- Allow all authenticated users to view bundles

CREATE POLICY "Admin/Owner can manage product bundles"
  ON public.product_bundles
  FOR ALL
  USING (
    (SELECT role FROM public.app_users WHERE user_id = auth.uid()) IN ('admin', 'owner')
  );

-- RLS for bundle components
ALTER TABLE public.product_bundle_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bundle components" 
  ON public.product_bundle_components 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admin/Owner can manage bundle components"
  ON public.product_bundle_components
  FOR ALL
  USING (
    (SELECT role FROM public.app_users WHERE user_id = auth.uid()) IN ('admin', 'owner')
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_product_bundles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_bundles_updated_at
  BEFORE UPDATE ON public.product_bundles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_bundles_updated_at();
