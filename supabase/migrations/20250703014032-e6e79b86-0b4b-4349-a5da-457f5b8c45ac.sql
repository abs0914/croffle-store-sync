-- Create expense_audit_trail table
CREATE TABLE public.expense_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('expense', 'budget', 'approval', 'category')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_name TEXT,
  user_role TEXT,
  store_id UUID REFERENCES public.stores(id),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on expense_audit_trail
ALTER TABLE public.expense_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS policy for expense_audit_trail
CREATE POLICY "Users can view audit trail for their stores" 
ON public.expense_audit_trail FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner') OR expense_audit_trail.store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "System can insert audit trail entries" 
ON public.expense_audit_trail FOR INSERT 
WITH CHECK (true);

-- Update expense_categories RLS to allow better access
DROP POLICY IF EXISTS "Users can view active expense categories" ON public.expense_categories;
CREATE POLICY "Users can view active expense categories" 
ON public.expense_categories FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

-- Add more expense categories (without conflict handling)
INSERT INTO public.expense_categories (name, description) VALUES
('Food & Beverages', 'Ingredients, drinks, and consumables for store operations'),
('Labor & Staffing', 'Employee wages, overtime, and temporary staff costs'),
('Store Operations', 'Daily operational expenses and store maintenance');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expense_audit_trail_entity ON public.expense_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_expense_audit_trail_store ON public.expense_audit_trail(store_id);
CREATE INDEX IF NOT EXISTS idx_expense_audit_trail_user ON public.expense_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store_status ON public.expenses(store_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);