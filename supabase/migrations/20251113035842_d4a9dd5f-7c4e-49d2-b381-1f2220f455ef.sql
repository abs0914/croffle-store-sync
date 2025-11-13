
-- Drop the existing restrictive policy for reading commissary inventory
DROP POLICY IF EXISTS "Managers and above can read commissary inventory" ON public.commissary_inventory;

-- Create a new policy that allows cashiers and stock_user to read commissary inventory
CREATE POLICY "Managers, cashiers and stock users can read commissary inventory"
ON public.commissary_inventory
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM app_users
    WHERE app_users.user_id = auth.uid()
      AND app_users.role IN ('admin', 'owner', 'manager', 'cashier', 'stock_user')
      AND app_users.is_active = true
  )
);
