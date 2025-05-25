
-- Drop any problematic RLS policies on app_users
DROP POLICY IF EXISTS "Users can view their assigned users" ON public.app_users;
DROP POLICY IF EXISTS "Admins and owners can manage users" ON public.app_users;
DROP POLICY IF EXISTS "Enable read access for authenticated users only" ON public.app_users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can update users" ON public.app_users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.app_users;

-- Create simplified RLS policy for app_users
CREATE POLICY "Enable read access for authenticated users only"
ON public.app_users
FOR SELECT
USING (auth.role() = 'authenticated');

-- Create policy for inserting users (admin/owner only)
CREATE POLICY "Admins can insert users"
ON public.app_users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR
  auth.email() = 'admin@example.com'
);

-- Create policy for updating users (admin/owner only)
CREATE POLICY "Admins can update users"
ON public.app_users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR
  auth.email() = 'admin@example.com'
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR
  auth.email() = 'admin@example.com'
);

-- Create policy for deleting users (admin/owner only)
CREATE POLICY "Admins can delete users"
ON public.app_users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR
  auth.email() = 'admin@example.com'
);

