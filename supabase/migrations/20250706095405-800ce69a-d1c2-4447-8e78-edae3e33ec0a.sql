
-- Add missing DELETE and UPDATE RLS policies to the recipes table
-- These policies will match the existing security model used by SELECT and INSERT policies

-- CREATE DELETE POLICY: Allow users to delete recipes in their assigned stores
CREATE POLICY "Users can delete recipes from their stores" ON recipes
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR recipes.store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  );

-- CREATE UPDATE POLICY: Allow users to update recipes in their assigned stores
CREATE POLICY "Users can update recipes from their stores" ON recipes
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.user_id = auth.uid() 
      AND (
        au.role IN ('admin', 'owner') 
        OR recipes.store_id = ANY(au.store_ids)
      )
    )
    OR auth.email() = 'admin@example.com'
  );
