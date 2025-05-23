
-- Drop any problematic RLS policies on app_users
DROP POLICY IF EXISTS "Users can view their assigned users" ON public.app_users;

-- Create simplified RLS policy for app_users
CREATE POLICY "Enable read access for authenticated users only" 
ON public.app_users
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy for managing users
CREATE POLICY "Admins and owners can manage users" 
ON public.app_users
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR
  auth.email() = 'admin@example.com'
);

