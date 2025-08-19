-- Enhanced Order Fulfillment System Database Structure

-- Add new status values to purchase_order_status enum
ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'in_progress';

-- Create purchase_order_fulfillments table for fulfillment sessions
CREATE TABLE IF NOT EXISTS public.purchase_order_fulfillments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  fulfillment_number VARCHAR NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_by UUID NOT NULL,
  completed_by UUID,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  total_fulfilled_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create purchase_order_fulfillment_items table for item-level tracking
CREATE TABLE IF NOT EXISTS public.purchase_order_fulfillment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fulfillment_id UUID NOT NULL REFERENCES public.purchase_order_fulfillments(id) ON DELETE CASCADE,
  purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
  ordered_quantity NUMERIC NOT NULL,
  fulfilled_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'partial', 'unavailable')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(fulfillment_id, purchase_order_item_id)
);

-- Create fulfillment_modifications table for change approval workflow
CREATE TABLE IF NOT EXISTS public.fulfillment_modifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fulfillment_id UUID NOT NULL REFERENCES public.purchase_order_fulfillments(id) ON DELETE CASCADE,
  modification_type TEXT NOT NULL CHECK (modification_type IN ('quantity_change', 'item_addition', 'item_removal', 'substitution')),
  requested_by UUID NOT NULL,
  approved_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  original_data JSONB,
  new_data JSONB NOT NULL,
  justification TEXT,
  approval_notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create function to generate fulfillment numbers
CREATE OR REPLACE FUNCTION public.generate_fulfillment_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  fulfillment_count INTEGER;
  fulfillment_number TEXT;
BEGIN
  SELECT COUNT(*) INTO fulfillment_count
  FROM public.purchase_order_fulfillments
  WHERE DATE(created_at) = CURRENT_DATE;
  
  fulfillment_number := 'FL-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((fulfillment_count + 1)::TEXT, 3, '0');
  RETURN fulfillment_number;
END;
$$;

-- Create trigger to set fulfillment number automatically
CREATE OR REPLACE FUNCTION public.set_fulfillment_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  IF NEW.fulfillment_number IS NULL OR NEW.fulfillment_number = '' THEN
    NEW.fulfillment_number := public.generate_fulfillment_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_fulfillment_number_trigger
  BEFORE INSERT ON public.purchase_order_fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_fulfillment_number();

-- Add updated_at triggers
CREATE TRIGGER update_fulfillments_updated_at
  BEFORE UPDATE ON public.purchase_order_fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fulfillment_items_updated_at
  BEFORE UPDATE ON public.purchase_order_fulfillment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fulfillment_modifications_updated_at
  BEFORE UPDATE ON public.fulfillment_modifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fulfillments_purchase_order_id ON public.purchase_order_fulfillments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_fulfillments_status ON public.purchase_order_fulfillments(status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_fulfillment_id ON public.purchase_order_fulfillment_items(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_modifications_fulfillment_id ON public.fulfillment_modifications(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_modifications_status ON public.fulfillment_modifications(status);

-- Enable RLS on all new tables
ALTER TABLE public.purchase_order_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_fulfillment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_modifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_order_fulfillments
CREATE POLICY "Admins and commissary team can manage fulfillments"
ON public.purchase_order_fulfillments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND (
      au.role IN ('admin', 'owner') OR
      (au.role IN ('manager', 'stock_user') AND 
       EXISTS (
         SELECT 1 FROM purchase_orders po
         WHERE po.id = purchase_order_fulfillments.purchase_order_id
       ))
    )
  )
);

-- RLS Policies for purchase_order_fulfillment_items
CREATE POLICY "Admins and commissary team can manage fulfillment items"
ON public.purchase_order_fulfillment_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND (
      au.role IN ('admin', 'owner') OR
      (au.role IN ('manager', 'stock_user') AND 
       EXISTS (
         SELECT 1 FROM purchase_order_fulfillments pof
         JOIN purchase_orders po ON po.id = pof.purchase_order_id
         WHERE pof.id = purchase_order_fulfillment_items.fulfillment_id
       ))
    )
  )
);

-- RLS Policies for fulfillment_modifications
CREATE POLICY "Admins and commissary team can manage modifications"
ON public.fulfillment_modifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND (
      au.role IN ('admin', 'owner') OR
      (au.role IN ('manager', 'stock_user'))
    )
  )
);

-- Add commissary-specific permissions to existing functions
CREATE OR REPLACE FUNCTION public.has_fulfillment_access(user_role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  RETURN user_role IN ('admin', 'owner', 'manager', 'stock_user');
END;
$$;