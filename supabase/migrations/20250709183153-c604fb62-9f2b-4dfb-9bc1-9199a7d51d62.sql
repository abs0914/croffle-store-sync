-- Fix RLS policies to avoid accessing users table directly
-- Drop existing problematic policies and create new ones that don't access auth.users

-- First, let's check if store_settings table exists and create proper RLS policies
DO $$ 
BEGIN
    -- Create store_settings table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'store_settings') THEN
        CREATE TABLE public.store_settings (
            id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
            bir_compliance_config JSONB DEFAULT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            UNIQUE(store_id)
        );
        
        -- Enable RLS
        ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop all existing policies on store_settings to avoid conflicts
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.store_settings;
DROP POLICY IF EXISTS "Users can manage store settings for their stores" ON public.store_settings;
DROP POLICY IF EXISTS "Store settings are viewable by store users" ON public.store_settings;
DROP POLICY IF EXISTS "Store settings are manageable by store users" ON public.store_settings;

-- Create new secure RLS policies that don't access auth.users table
CREATE POLICY "Users can view store settings for their stores" 
ON public.store_settings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 
        FROM public.app_users au 
        WHERE au.user_id = auth.uid() 
        AND (
            au.role IN ('admin', 'owner') 
            OR store_settings.store_id = ANY(au.store_ids)
        )
    )
);

CREATE POLICY "Users can manage store settings for their stores" 
ON public.store_settings 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 
        FROM public.app_users au 
        WHERE au.user_id = auth.uid() 
        AND (
            au.role IN ('admin', 'owner') 
            OR store_settings.store_id = ANY(au.store_ids)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.app_users au 
        WHERE au.user_id = auth.uid() 
        AND (
            au.role IN ('admin', 'owner') 
            OR store_settings.store_id = ANY(au.store_ids)
        )
    )
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_settings_updated_at();