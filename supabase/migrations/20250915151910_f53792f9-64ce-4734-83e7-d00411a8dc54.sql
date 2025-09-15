-- Add transaction_id column to inventory_transactions table for proper linking
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_transaction_id 
ON public.inventory_transactions(transaction_id);

-- Add comments for clarity
COMMENT ON COLUMN public.inventory_transactions.transaction_id IS 'Links inventory transaction to a sales transaction for proper audit trail';