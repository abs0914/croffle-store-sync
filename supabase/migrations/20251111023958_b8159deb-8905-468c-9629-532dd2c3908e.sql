-- Remove legacy policies that query auth.users directly
-- These policies cause "permission denied for table users" errors

DROP POLICY IF EXISTS "Admin can manage all stores" ON stores;
DROP POLICY IF EXISTS "Owner can manage their stores" ON stores;

-- The correct policies remain:
-- ✓ "Users can view stores they have access to" - Uses app_users table
-- ✓ "Admins and owners can manage all stores" - Uses app_users table