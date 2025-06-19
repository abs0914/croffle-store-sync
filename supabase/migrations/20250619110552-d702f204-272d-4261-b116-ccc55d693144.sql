
-- Add ownership type and franchise-related fields to stores table
ALTER TABLE public.stores 
ADD COLUMN ownership_type text DEFAULT 'company_owned' CHECK (ownership_type IN ('company_owned', 'franchisee')),
ADD COLUMN franchise_agreement_date date,
ADD COLUMN franchise_fee_percentage numeric(5,2) DEFAULT 0,
ADD COLUMN franchisee_contact_info jsonb;

-- Update existing stores to be company_owned by default
UPDATE public.stores SET ownership_type = 'company_owned' WHERE ownership_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.stores.ownership_type IS 'Store ownership type: company_owned or franchisee';
COMMENT ON COLUMN public.stores.franchise_agreement_date IS 'Date when franchise agreement was signed';
COMMENT ON COLUMN public.stores.franchise_fee_percentage IS 'Percentage of revenue shared with franchisee';
COMMENT ON COLUMN public.stores.franchisee_contact_info IS 'JSON object containing franchisee contact details';
