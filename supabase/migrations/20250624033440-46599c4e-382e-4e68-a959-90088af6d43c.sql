
-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.expense_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_level INTEGER DEFAULT 0,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expense budgets table
CREATE TABLE public.expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  budget_period TEXT NOT NULL CHECK (budget_period IN ('monthly', 'quarterly', 'yearly')),
  budget_year INTEGER NOT NULL,
  budget_month INTEGER CHECK (budget_month BETWEEN 1 AND 12),
  budget_quarter INTEGER CHECK (budget_quarter BETWEEN 1 AND 4),
  allocated_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  spent_amount NUMERIC(10,2) DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id, category_id, budget_period, budget_year, budget_month, budget_quarter)
);

-- Create expense approvals table
CREATE TABLE public.expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id),
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approval_level INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expense approval limits table
CREATE TABLE public.expense_approval_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  max_amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all expense tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_approval_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories
CREATE POLICY "Users can view active expense categories" 
ON public.expense_categories FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Admins can manage expense categories" 
ON public.expense_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
);

-- RLS Policies for expenses
CREATE POLICY "Users can view expenses for their stores" 
ON public.expenses FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "Users can create expenses for their stores" 
ON public.expenses FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their own expenses or approve if authorized" 
ON public.expenses FOR UPDATE 
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner', 'manager'))
  )
);

-- RLS Policies for expense_budgets
CREATE POLICY "Users can view budgets for their stores" 
ON public.expense_budgets FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "Admins can manage expense budgets" 
ON public.expense_budgets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
);

-- RLS Policies for expense_approvals
CREATE POLICY "Users can view relevant expense approvals" 
ON public.expense_approvals FOR SELECT 
USING (
  approver_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_id AND e.created_by = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
);

CREATE POLICY "Authorized users can manage expense approvals" 
ON public.expense_approvals FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner', 'manager')
  )
);

-- RLS Policies for expense_approval_limits
CREATE POLICY "Users can view approval limits" 
ON public.expense_approval_limits FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage approval limits" 
ON public.expense_approval_limits FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_expense_categories_updated_at 
  BEFORE UPDATE ON public.expense_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON public.expenses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_budgets_updated_at 
  BEFORE UPDATE ON public.expense_budgets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expense_approval_limits_updated_at 
  BEFORE UPDATE ON public.expense_approval_limits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
('Operating Expenses', 'General operational costs'),
('Utilities', 'Electricity, water, internet, phone'),
('Rent & Facilities', 'Store rent, facility maintenance'),
('Marketing & Advertising', 'Promotional activities, advertising costs'),
('Staff & Payroll', 'Employee wages, benefits, training'),
('Maintenance & Repairs', 'Equipment maintenance, store repairs'),
('Supplies & Materials', 'Office supplies, cleaning materials'),
('Equipment & Technology', 'Equipment purchases, software licenses'),
('Professional Services', 'Legal, accounting, consulting fees'),
('Travel & Transportation', 'Business travel, delivery costs'),
('Insurance', 'Business insurance premiums'),
('Miscellaneous', 'Other business expenses');

-- Insert default approval limits
INSERT INTO public.expense_approval_limits (role, max_amount) VALUES
('cashier', 500.00),
('manager', 5000.00),
('owner', 50000.00),
('admin', 999999.99);

-- Create function to update budget spent amounts
CREATE OR REPLACE FUNCTION update_budget_spent_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Update spent amount when expense is approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE public.expense_budgets 
    SET spent_amount = spent_amount + NEW.amount,
        updated_at = now()
    WHERE store_id = NEW.store_id 
      AND category_id = NEW.category_id
      AND budget_period = 'monthly'
      AND budget_year = EXTRACT(YEAR FROM NEW.expense_date)
      AND budget_month = EXTRACT(MONTH FROM NEW.expense_date);
  END IF;
  
  -- Decrease spent amount when expense is rejected after being approved
  IF NEW.status = 'rejected' AND OLD.status = 'approved' THEN
    UPDATE public.expense_budgets 
    SET spent_amount = spent_amount - NEW.amount,
        updated_at = now()
    WHERE store_id = NEW.store_id 
      AND category_id = NEW.category_id
      AND budget_period = 'monthly'
      AND budget_year = EXTRACT(YEAR FROM NEW.expense_date)
      AND budget_month = EXTRACT(MONTH FROM NEW.expense_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update budget amounts
CREATE TRIGGER update_budget_on_expense_status_change
  AFTER UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_spent_amount();
