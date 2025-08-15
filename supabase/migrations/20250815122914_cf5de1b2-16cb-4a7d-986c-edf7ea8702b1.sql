-- Fix RLS policies that are directly accessing auth.users table
-- This is causing "permission denied for table users" errors

-- Drop the problematic policies that directly query auth.users
DROP POLICY IF EXISTS "Admin can manage all stores" ON public.stores;
DROP POLICY IF EXISTS "Owner can manage their stores" ON public.stores;
DROP POLICY IF EXISTS "Admin can manage all user store associations" ON public.user_stores;
DROP POLICY IF EXISTS "Admin, Owner and Manager can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admin, Owner and Manager can delete customers" ON public.customers;

-- Create new policies using app_users instead of auth.users
CREATE POLICY "Admins and owners can manage all stores" 
ON public.stores 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND is_active = true
  )
);

CREATE POLICY "Managers can manage their assigned stores" 
ON public.stores 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() 
    AND (
      role IN ('admin', 'owner') 
      OR (role = 'manager' AND stores.id = ANY(store_ids))
    )
    AND is_active = true
  )
);

-- Fix user_stores policies
CREATE POLICY "Authorized users can manage store associations" 
ON public.user_stores 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND is_active = true
  )
);

-- Update customers policies to use app_users
CREATE POLICY "Authorized users can manage customers" 
ON public.customers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner') 
      OR (
        au.role IN ('manager', 'cashier') 
        AND customers.store_id = ANY(au.store_ids)
      )
    )
  )
);

-- Add policy for users to view stores they have access to
CREATE POLICY "Users can view accessible stores" 
ON public.stores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner') 
      OR id = ANY(au.store_ids)
    )
  )
);