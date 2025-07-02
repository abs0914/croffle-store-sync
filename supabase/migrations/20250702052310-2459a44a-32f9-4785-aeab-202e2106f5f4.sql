-- Add support for multiple senior citizen discounts
ALTER TABLE public.transactions 
ADD COLUMN senior_discounts JSONB DEFAULT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN public.transactions.senior_discounts IS 'Array of senior citizen discount details with ID numbers and amounts';

-- Add support for multiple discount types in a single transaction
ALTER TABLE public.transactions 
ADD COLUMN discount_details JSONB DEFAULT NULL;

-- Add comment to describe the column  
COMMENT ON COLUMN public.transactions.discount_details IS 'Detailed breakdown of all discounts applied to the transaction';