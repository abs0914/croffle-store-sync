
-- Add bir_compliance_config column to store_settings table
ALTER TABLE public.store_settings 
ADD COLUMN bir_compliance_config JSONB DEFAULT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN public.store_settings.bir_compliance_config IS 'BIR compliance configuration settings for the store';
