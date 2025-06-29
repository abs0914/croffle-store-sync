
-- Remove location_pricing related tables and data
-- First, remove the foreign key dependent tables
DROP TABLE IF EXISTS public.location_pricing CASCADE;
DROP TABLE IF EXISTS public.regional_suppliers CASCADE;

-- Remove the location-related columns from other tables
ALTER TABLE public.stores 
DROP COLUMN IF EXISTS location_type,
DROP COLUMN IF EXISTS region,
DROP COLUMN IF EXISTS logistics_zone,
DROP COLUMN IF EXISTS shipping_cost_multiplier;

ALTER TABLE public.purchase_orders 
DROP COLUMN IF EXISTS location_type,
DROP COLUMN IF EXISTS shipping_cost,
DROP COLUMN IF EXISTS logistics_notes;

-- Drop the location-related functions
DROP FUNCTION IF EXISTS public.get_location_pricing(uuid, text);
DROP FUNCTION IF EXISTS public.get_location_suppliers(text);
