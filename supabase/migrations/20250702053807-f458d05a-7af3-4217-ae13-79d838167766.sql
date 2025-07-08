-- Check if store_settings table exists and create it if needed
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  bir_compliance_config JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id)
);

-- Enable Row Level Security
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for store_settings
CREATE POLICY "Users can view store settings for their stores" 
ON public.store_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "Admins and managers can manage store settings" 
ON public.store_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR (au.role = 'manager' AND store_id = ANY(au.store_ids))
    )
  )
);

-- Add comment to describe the bir_compliance_config column
COMMENT ON COLUMN public.store_settings.bir_compliance_config IS 'BIR compliance configuration settings for the store';