-- Create transaction_items table for detailed line items
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  variation_id UUID,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category_id UUID,
  category_name TEXT,
  product_type TEXT DEFAULT 'regular',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON public.transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_category_id ON public.transaction_items(category_id);

-- Enable RLS
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view transaction items for their stores" 
ON public.transaction_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.transactions t
    JOIN public.app_users au ON (
      au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR t.store_id = ANY(au.store_ids)
      )
    )
    WHERE t.id = transaction_items.transaction_id
  )
);

CREATE POLICY "System can insert transaction items" 
ON public.transaction_items FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update transaction items" 
ON public.transaction_items FOR UPDATE 
USING (true);

-- Grant permissions
GRANT ALL ON public.transaction_items TO authenticated;
GRANT ALL ON public.transaction_items TO service_role;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_transaction_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transaction_items_updated_at
  BEFORE UPDATE ON public.transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_items_updated_at();