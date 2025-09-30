-- Enable RLS on app_users_backup_reset table to protect employee personal data
ALTER TABLE public.app_users_backup_reset ENABLE ROW LEVEL SECURITY;

-- Only admins and owners can view backup data
CREATE POLICY "Only admins and owners can view backup user data"
ON public.app_users_backup_reset
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid()
    AND au.role IN ('admin', 'owner')
    AND au.is_active = true
  )
);

-- Prevent any modifications to backup data (read-only for admins/owners)
CREATE POLICY "Backup table is read-only"
ON public.app_users_backup_reset
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);