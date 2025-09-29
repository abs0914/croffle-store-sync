-- Add transaction_id column to inventory_transactions table for proper linking
ALTER TABLE public.inventory_transactions 
ADD COLUMN transaction_id UUID REFERENCES public.transactions(id);

-- Add index for performance
CREATE INDEX idx_inventory_transactions_transaction_id 
ON public.inventory_transactions(transaction_id);

-- Add transaction_type enum values for sales deductions
ALTER TYPE transaction_type ADD VALUE 'sale_deduction' AFTER 'adjustment';

-- Add comments for clarity
COMMENT ON COLUMN public.inventory_transactions.transaction_id IS 'Links inventory transaction to a sales transaction';
COMMENT ON COLUMN public.inventory_transactions.transaction_type IS 'Type of inventory transaction: adjustment, transfer, sale_deduction, etc.';