-- Add RLS policies for categories table to fix POS access issue

-- Allow authenticated users to view categories for stores they have access to
CREATE POLICY "Users can view categories for accessible stores" 
ON public.categories 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true 
    AND (
      au.role IN ('admin', 'owner') 
      OR categories.store_id = ANY(au.store_ids)
    )
  )
);

-- Allow admins, owners, and managers to insert categories
CREATE POLICY "Admins, owners, and managers can create categories" 
ON public.categories 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true 
    AND (
      au.role IN ('admin', 'owner') 
      OR (au.role = 'manager' AND categories.store_id = ANY(au.store_ids))
    )
  )
);

-- Allow admins, owners, and managers to update categories for their stores
CREATE POLICY "Admins, owners, and managers can update categories" 
ON public.categories 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true 
    AND (
      au.role IN ('admin', 'owner') 
      OR (au.role = 'manager' AND categories.store_id = ANY(au.store_ids))
    )
  )
);

-- Allow admins and owners to delete categories
CREATE POLICY "Admins and owners can delete categories" 
ON public.categories 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND au.is_active = true 
    AND au.role IN ('admin', 'owner')
  )
);