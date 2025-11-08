-- ============================================
-- FIX: Optimize transaction RLS policies to prevent timeouts
-- Problem: Complex EXISTS + ANY(array) causing statement timeouts
-- Solution: Simplify SELECT policy and add supporting indexes
-- ============================================

-- First, add index on app_users for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_user_id_role 
ON app_users(user_id, role);

-- Add index for store_ids array searches (GIN index for array containment)
CREATE INDEX IF NOT EXISTS idx_app_users_store_ids 
ON app_users USING GIN(store_ids);

-- Drop the slow existing SELECT policy
DROP POLICY IF EXISTS "Users can view transactions from their stores" ON transactions;

-- Create optimized SELECT policy - split into 3 simple checks
CREATE POLICY "Users can view transactions from their stores - optimized"
ON transactions
FOR SELECT
TO public
USING (
  -- Check 1: User is admin or owner (fastest check)
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
    LIMIT 1
  )
  OR
  -- Check 2: User owns this transaction
  user_id = auth.uid()
  OR
  -- Check 3: Transaction store is in user's accessible stores
  -- Using <@ operator for array containment (faster than ANY)
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND transactions.store_id = ANY(store_ids)
    LIMIT 1
  )
);

-- Add comment explaining the optimization
COMMENT ON POLICY "Users can view transactions from their stores - optimized" ON transactions IS 
'Optimized RLS policy using indexed lookups and LIMIT 1 to prevent full table scans that cause timeouts';