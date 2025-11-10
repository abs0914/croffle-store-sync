-- Fix critical security issues identified in security scan

-- 1. DROP PUBLIC READ ACCESS TO STORES TABLE
-- This policy allows unauthenticated users to view all store data including TINs, 
-- owner info, and BIR accreditation details
DROP POLICY IF EXISTS "Allow public read access to stores" ON stores;

-- 2. DROP OVERLY PERMISSIVE AUTHENTICATED USER POLICIES ON STORES
-- These policies allow ANY authenticated user (even without store access) to 
-- view/modify/delete ALL stores
DROP POLICY IF EXISTS "Allow authenticated users to select stores" ON stores;
DROP POLICY IF EXISTS "Allow authenticated users to update stores" ON stores;
DROP POLICY IF EXISTS "Allow authenticated users to delete stores" ON stores;
DROP POLICY IF EXISTS "Allow authenticated users to insert stores" ON stores;

-- 3. ENABLE RLS ON BACKUP TABLE
-- stores_backup_reset table has RLS disabled, exposing backup data
ALTER TABLE stores_backup_reset ENABLE ROW LEVEL SECURITY;

-- Create admin-only policy for stores_backup_reset
CREATE POLICY "Admin only access to stores backup"
  ON stores_backup_reset
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_users au
      WHERE au.user_id = auth.uid()
      AND au.role = 'admin'
      AND au.is_active = true
    )
  );

-- Verify remaining policies on stores are secure:
-- ✓ "Users can view stores they have access to" - Properly restricts to user's stores
-- ✓ "Admins and owners can manage all stores" - Admin/owner only
-- ✓ "Admin can manage all stores" - Admin only (legacy)
-- ✓ "Owner can manage their stores" - Owner only (legacy)