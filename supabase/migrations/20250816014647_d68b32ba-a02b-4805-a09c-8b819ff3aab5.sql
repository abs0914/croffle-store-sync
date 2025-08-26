-- Fix supplier RLS policies for production readiness
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.suppliers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.suppliers;

-- Create new role-based RLS policies for suppliers
CREATE POLICY "Admins and owners can manage all suppliers"
ON public.suppliers
FOR ALL
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

CREATE POLICY "Managers can view and update suppliers for their operations"
ON public.suppliers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
    AND au.role IN ('manager', 'stock_user', 'production_user')
  )
);

CREATE POLICY "Managers can update supplier contact info"
ON public.suppliers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
    AND au.role IN ('manager', 'stock_user')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
    AND au.role IN ('manager', 'stock_user')
  )
);