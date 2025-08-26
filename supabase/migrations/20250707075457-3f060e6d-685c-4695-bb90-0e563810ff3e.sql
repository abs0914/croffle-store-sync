-- Add owner information and store photo fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS store_location_photo_url TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS owner_address TEXT,
ADD COLUMN IF NOT EXISTS owner_contact_number TEXT,
ADD COLUMN IF NOT EXISTS owner_email TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT CHECK (business_type IN ('sole_proprietor', 'corporation', 'partnership')),
ADD COLUMN IF NOT EXISTS franchise_fee_amount NUMERIC(10,2) DEFAULT 0;

-- Update existing franchise_fee_percentage to franchise_fee_amount for consistency
-- Note: This doesn't drop the old column to maintain backward compatibility
COMMENT ON COLUMN public.stores.franchise_fee_percentage IS 'Deprecated: Use franchise_fee_amount instead';
COMMENT ON COLUMN public.stores.franchise_fee_amount IS 'Franchise fee in Philippine Peso (PHP)';