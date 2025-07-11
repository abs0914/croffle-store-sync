-- Fix transactions RLS policies to allow store-based access for reports
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;

-- Create new policy that allows users to view transactions from their stores
CREATE POLICY "Users can view transactions from their stores" 
ON transactions 
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