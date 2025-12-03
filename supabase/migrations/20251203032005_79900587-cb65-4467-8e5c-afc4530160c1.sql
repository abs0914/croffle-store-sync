-- Create failed_inventory_queue table for tracking inventory deduction failures
-- Allows transactions to complete while queuing inventory issues for manual review

CREATE TABLE IF NOT EXISTS public.failed_inventory_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  error_message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.failed_inventory_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access
CREATE POLICY "Staff can view failed inventory queue for their stores"
ON public.failed_inventory_queue
FOR SELECT
USING (
  store_id IN (
    SELECT unnest(store_ids) FROM public.app_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Staff can insert failed inventory records"
ON public.failed_inventory_queue
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff can update failed inventory queue for their stores"
ON public.failed_inventory_queue
FOR UPDATE
USING (
  store_id IN (
    SELECT unnest(store_ids) FROM public.app_users WHERE user_id = auth.uid()
  )
);

-- Create index for efficient queries
CREATE INDEX idx_failed_inventory_queue_store_status ON public.failed_inventory_queue(store_id, status);
CREATE INDEX idx_failed_inventory_queue_created_at ON public.failed_inventory_queue(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_failed_inventory_queue_updated_at
BEFORE UPDATE ON public.failed_inventory_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();