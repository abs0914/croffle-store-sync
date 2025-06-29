
-- Enable RLS on commissary_inventory table if not already enabled
ALTER TABLE public.commissary_inventory ENABLE ROW LEVEL SECURITY;

-- Create policy to allow managers and above to read commissary inventory
CREATE POLICY "Managers and above can read commissary inventory" 
ON public.commissary_inventory 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner', 'manager')
    AND is_active = true
  )
);

-- Also allow admins and owners to manage commissary inventory
CREATE POLICY "Admins and owners can manage commissary inventory" 
ON public.commissary_inventory 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND is_active = true
  )
);
