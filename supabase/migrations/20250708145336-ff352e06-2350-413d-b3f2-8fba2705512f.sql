
-- Create customer analytics and management tables
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customer tags for segmentation
CREATE TABLE IF NOT EXISTS public.customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customer tag assignments
CREATE TABLE IF NOT EXISTS public.customer_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id, tag_id)
);

-- Create loyalty points table
CREATE TABLE IF NOT EXISTS public.customer_loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL DEFAULT 0,
  points_redeemed INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  transaction_id UUID REFERENCES public.transactions(id),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjustment')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add loyalty points balance to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_visit_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registration_source VARCHAR(50) DEFAULT 'pos',
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id ON public.customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tag_assignments_customer_id ON public.customer_tag_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_points_customer_id ON public.customer_loyalty_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active);

-- Enable RLS on new tables
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_points ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer notes
CREATE POLICY "Users can manage customer notes for their stores" ON public.customer_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.app_users au ON (au.user_id = auth.uid())
    WHERE c.id = customer_notes.customer_id
    AND (au.role IN ('admin', 'owner') OR c.store_id = ANY(au.store_ids))
  )
);

-- Create RLS policies for customer tags
CREATE POLICY "Admin and owners can manage customer tags" ON public.customer_tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Users can view customer tags" ON public.customer_tags
FOR SELECT USING (auth.role() = 'authenticated');

-- Create RLS policies for customer tag assignments
CREATE POLICY "Users can manage customer tag assignments for their stores" ON public.customer_tag_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.app_users au ON (au.user_id = auth.uid())
    WHERE c.id = customer_tag_assignments.customer_id
    AND (au.role IN ('admin', 'owner') OR c.store_id = ANY(au.store_ids))
  )
);

-- Create RLS policies for customer loyalty points
CREATE POLICY "Users can manage customer loyalty points for their stores" ON public.customer_loyalty_points
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    JOIN public.app_users au ON (au.user_id = auth.uid())
    WHERE c.id = customer_loyalty_points.customer_id
    AND (au.role IN ('admin', 'owner') OR c.store_id = ANY(au.store_ids))
  )
);

-- Create function to update customer loyalty tier based on points
CREATE OR REPLACE FUNCTION public.update_customer_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.customers 
  SET loyalty_tier = CASE 
    WHEN NEW.current_balance >= 1000 THEN 'gold'
    WHEN NEW.current_balance >= 500 THEN 'silver'
    ELSE 'bronze'
  END,
  loyalty_points = NEW.current_balance
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update loyalty tier
CREATE TRIGGER update_customer_loyalty_tier_trigger
  AFTER INSERT OR UPDATE ON public.customer_loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_loyalty_tier();

-- Insert default customer tags
INSERT INTO public.customer_tags (name, color, description) VALUES
('VIP', '#FFD700', 'High-value customers'),
('Regular', '#3B82F6', 'Regular customers'),
('New', '#10B981', 'Recently registered customers'),
('At Risk', '#EF4444', 'Customers who haven\'t visited recently'),
('Birthday', '#8B5CF6', 'Customers with upcoming birthdays')
ON CONFLICT (name) DO NOTHING;

-- Create function to calculate customer lifetime value
CREATE OR REPLACE FUNCTION public.calculate_customer_lifetime_value(customer_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
  ltv NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total), 0) INTO ltv
  FROM public.transactions
  WHERE customer_id = customer_id_param AND status = 'completed';
  
  RETURN ltv;
END;
$$ LANGUAGE plpgsql;

-- Create function to update customer last visit date on transaction
CREATE OR REPLACE FUNCTION public.update_customer_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL AND NEW.status = 'completed' THEN
    UPDATE public.customers 
    SET last_visit_date = NEW.created_at
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update customer last visit date
CREATE TRIGGER update_customer_last_visit_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_last_visit();
