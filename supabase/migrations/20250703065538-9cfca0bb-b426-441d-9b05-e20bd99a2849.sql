-- Check current RLS policies on store_inventory_alerts table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'store_inventory_alerts';

-- Allow inventory update operations to create alerts
CREATE POLICY "Allow system to create inventory alerts" 
ON public.store_inventory_alerts 
FOR INSERT 
WITH CHECK (true);

-- Allow users to view alerts for their stores
CREATE POLICY "Users can view alerts for their stores" 
ON public.store_inventory_alerts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR store_inventory_alerts.store_id = ANY(au.store_ids)
    )
  )
);

-- Allow users to acknowledge alerts for their stores
CREATE POLICY "Users can acknowledge alerts for their stores" 
ON public.store_inventory_alerts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR store_inventory_alerts.store_id = ANY(au.store_ids)
    )
  )
);