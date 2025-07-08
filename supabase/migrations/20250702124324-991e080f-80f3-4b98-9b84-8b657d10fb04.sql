-- Add missing fields to stores table for franchise and location information
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS opening_date date,
ADD COLUMN IF NOT EXISTS location_type text CHECK (location_type IN ('inside_cebu', 'outside_cebu')),
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS logistics_zone text;

-- Add comments for documentation
COMMENT ON COLUMN public.stores.opening_date IS 'Date when the store opened for business';
COMMENT ON COLUMN public.stores.location_type IS 'Store location type: inside_cebu or outside_cebu';
COMMENT ON COLUMN public.stores.region IS 'Store region for logistics purposes';
COMMENT ON COLUMN public.stores.logistics_zone IS 'Logistics zone for delivery and supply chain';