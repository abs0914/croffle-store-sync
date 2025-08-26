-- Create transaction_voids table for audit trail
CREATE TABLE public.transaction_voids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  voided_by UUID NOT NULL,
  void_reason TEXT NOT NULL,
  reason_category TEXT NOT NULL CHECK (reason_category IN ('mistake', 'customer_request', 'wrong_order', 'system_error', 'other')),
  notes TEXT,
  original_amount NUMERIC NOT NULL,
  voided_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transaction_voids ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transaction_voids
CREATE POLICY "Users can view voids for their stores" ON public.transaction_voids
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE t.id = transaction_voids.transaction_id
    AND (au.role IN ('admin', 'owner') OR t.store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "Users can create void records for their stores" ON public.transaction_voids
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE t.id = transaction_voids.transaction_id
    AND (au.role IN ('admin', 'owner') OR t.store_id = ANY(au.store_ids))
  )
);

-- Create index for better performance
CREATE INDEX idx_transaction_voids_transaction_id ON public.transaction_voids(transaction_id);
CREATE INDEX idx_transaction_voids_voided_at ON public.transaction_voids(voided_at);