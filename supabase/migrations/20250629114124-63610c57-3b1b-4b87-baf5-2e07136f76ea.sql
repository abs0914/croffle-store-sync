
-- Restore location-related columns to stores table (without pricing)
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS location_type text,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS logistics_zone text;

-- Note: We're NOT restoring shipping_cost_multiplier as that was pricing-related
