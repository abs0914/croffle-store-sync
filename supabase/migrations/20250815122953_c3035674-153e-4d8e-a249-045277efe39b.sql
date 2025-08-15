-- First, check and drop ALL existing policies that might conflict
-- Fix RLS policies that are directly accessing auth.users table

-- Drop ALL existing policies on stores table
DROP POLICY IF EXISTS "Admins and owners can manage all stores" ON public.stores;
DROP POLICY IF EXISTS "Managers can manage their assigned stores" ON public.stores;
DROP POLICY IF EXISTS "Users can view accessible stores" ON public.stores;
DROP POLICY IF EXISTS "Admin can manage all stores" ON public.stores;
DROP POLICY IF EXISTS "Owner can manage their stores" ON public.stores;

-- Drop policies on user_stores
DROP POLICY IF EXISTS "Authorized users can manage store associations" ON public.user_stores;
DROP POLICY IF EXISTS "Admin can manage all user store associations" ON public.user_stores;

-- Drop policies on customers that use auth.users
DROP POLICY IF EXISTS "Authorized users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admin, Owner and Manager can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Admin, Owner and Manager can delete customers" ON public.customers;

-- Now create the corrected policies using app_users table only
CREATE POLICY "Secure store access" 
ON public.stores 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner') 
      OR stores.id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "Secure user stores access" 
ON public.user_stores 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() 
    AND au.role IN ('admin', 'owner')
    AND au.is_active = true
  )
);

-- This policy already exists and works correctly, so we keep the existing one
-- "Users can manage customers in accessible stores" is already using app_users properly