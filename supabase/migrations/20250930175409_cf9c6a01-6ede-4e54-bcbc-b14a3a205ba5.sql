-- Enable RLS on deleted_transactions_backup table to protect customer transaction data
ALTER TABLE public.deleted_transactions_backup ENABLE ROW LEVEL SECURITY;

-- Only admins and owners can view deleted transaction backup data
CREATE POLICY "Only admins and owners can view deleted transaction backups"
ON public.deleted_transactions_backup
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

-- Prevent any modifications to deleted transaction backup data (read-only for admins/owners)
CREATE POLICY "Deleted transaction backup is read-only"
ON public.deleted_transactions_backup
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);