-- Create user_store_access table as it's missing but needed by existing policies
CREATE TABLE IF NOT EXISTS public.user_store_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  role text DEFAULT 'staff',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Enable RLS
ALTER TABLE public.user_store_access ENABLE ROW LEVEL SECURITY;

-- Basic policies for the table
CREATE POLICY "Users can view their own store access" 
ON public.user_store_access 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all store access" 
ON public.user_store_access 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
    AND au.is_active = true
  )
);

-- Populate table from existing app_users data
INSERT INTO public.user_store_access (user_id, store_id, role, can_access)
SELECT 
  au.user_id,
  store_id,
  au.role::text,
  true
FROM public.app_users au
CROSS JOIN LATERAL unnest(au.store_ids) AS store_id
WHERE au.store_ids IS NOT NULL AND au.is_active = true
ON CONFLICT (user_id, store_id) DO NOTHING;