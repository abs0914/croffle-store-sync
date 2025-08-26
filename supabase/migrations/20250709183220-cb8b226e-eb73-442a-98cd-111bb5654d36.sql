-- Fix RLS policies for store_settings table to avoid auth.users access issues

-- Get current policies and drop them explicitly
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on store_settings
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'store_settings' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.store_settings', policy_record.policyname);
    END LOOP;
END $$;

-- Create new secure RLS policies
CREATE POLICY "store_settings_select_policy" 
ON public.store_settings 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 
        FROM public.app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.is_active = true
        AND (
            au.role IN ('admin', 'owner') 
            OR store_settings.store_id = ANY(au.store_ids)
        )
    )
);

CREATE POLICY "store_settings_insert_policy" 
ON public.store_settings 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.is_active = true
        AND (
            au.role IN ('admin', 'owner') 
            OR store_settings.store_id = ANY(au.store_ids)
        )
    )
);

CREATE POLICY "store_settings_update_policy" 
ON public.store_settings 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 
        FROM public.app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.is_active = true
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
        AND au.is_active = true
        AND (
            au.role IN ('admin', 'owner') 
            OR store_settings.store_id = ANY(au.store_ids)
        )
    )
);

CREATE POLICY "store_settings_delete_policy" 
ON public.store_settings 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 
        FROM public.app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.is_active = true
        AND au.role IN ('admin', 'owner')
    )
);