
-- Create inventory conversion mappings table
CREATE TABLE public.inventory_conversion_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_stock_id UUID NOT NULL REFERENCES public.inventory_stock(id) ON DELETE CASCADE,
  recipe_ingredient_name TEXT NOT NULL,
  recipe_ingredient_unit TEXT NOT NULL,
  conversion_factor NUMERIC NOT NULL CHECK (conversion_factor > 0),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_mapping UNIQUE(inventory_stock_id, recipe_ingredient_name, recipe_ingredient_unit)
);

-- Add fractional stock tracking to inventory_stock
ALTER TABLE public.inventory_stock 
ADD COLUMN fractional_stock NUMERIC DEFAULT 0;

-- Add RLS policies for conversion mappings
ALTER TABLE public.inventory_conversion_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view conversion mappings for their accessible stores
CREATE POLICY "Users can view conversion mappings for accessible stores" 
  ON public.inventory_conversion_mappings 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_stock 
      WHERE inventory_stock.id = inventory_conversion_mappings.inventory_stock_id
      AND (
        -- Admin/Owner can see all
        (SELECT role FROM public.app_users WHERE user_id = auth.uid()) IN ('admin', 'owner')
        OR
        -- Users can see mappings for stores they have access to
        inventory_stock.store_id = ANY(
          SELECT unnest(store_ids) FROM public.app_users WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Policy: Admin/Owner can insert conversion mappings
CREATE POLICY "Admin/Owner can insert conversion mappings"
  ON public.inventory_conversion_mappings
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.app_users WHERE user_id = auth.uid()) IN ('admin', 'owner')
  );

-- Policy: Admin/Owner can update conversion mappings
CREATE POLICY "Admin/Owner can update conversion mappings"
  ON public.inventory_conversion_mappings
  FOR UPDATE
  USING (
    (SELECT role FROM public.app_users WHERE user_id = auth.uid()) IN ('admin', 'owner')
  );

-- Policy: Admin/Owner can delete conversion mappings
CREATE POLICY "Admin/Owner can delete conversion mappings"
  ON public.inventory_conversion_mappings
  FOR DELETE
  USING (
    (SELECT role FROM public.app_users WHERE user_id = auth.uid()) IN ('admin', 'owner')
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_conversion_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversion_mappings_updated_at
  BEFORE UPDATE ON public.inventory_conversion_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversion_mappings_updated_at();

-- Add index for performance
CREATE INDEX idx_conversion_mappings_inventory_stock ON public.inventory_conversion_mappings(inventory_stock_id);
CREATE INDEX idx_conversion_mappings_ingredient ON public.inventory_conversion_mappings(recipe_ingredient_name, recipe_ingredient_unit);
