-- Delete all transactions for September 10th and 11th, 2025
-- This will also cascade to related audit logs and inventory movements

-- First, create a backup log of what we're about to delete
CREATE TABLE IF NOT EXISTS deleted_transactions_backup AS
SELECT 
  t.*,
  NOW() as deletion_timestamp,
  'bulk_delete_sept_10_11' as deletion_reason
FROM transactions t
WHERE t.created_at::date IN ('2025-09-10', '2025-09-11');

-- Log the deletion in BIR audit for compliance
DO $$ 
DECLARE
  store_rec RECORD;
  transaction_count INTEGER;
BEGIN
  -- Log deletion for each affected store
  FOR store_rec IN 
    SELECT DISTINCT store_id 
    FROM transactions 
    WHERE created_at::date IN ('2025-09-10', '2025-09-11')
  LOOP
    SELECT COUNT(*) INTO transaction_count
    FROM transactions 
    WHERE store_id = store_rec.store_id 
    AND created_at::date IN ('2025-09-10', '2025-09-11');
    
    -- Log the mass deletion event
    PERFORM log_bir_audit(
      store_rec.store_id,
      'ADMIN_ACTION',
      'BULK_TRANSACTION_DELETE',
      jsonb_build_object(
        'deleted_dates', ARRAY['2025-09-10', '2025-09-11'],
        'transaction_count', transaction_count,
        'deletion_timestamp', NOW(),
        'reason', 'Admin requested bulk deletion for Sept 10-11'
      ),
      NULL, -- user_id not available in migration
      'SYSTEM',
      'ADMIN-CONSOLE'
    );
  END LOOP;
END $$;

-- Delete related inventory movements first (if any exist)
DELETE FROM inventory_movements 
WHERE reference_type = 'transaction' 
AND reference_id IN (
  SELECT id FROM transactions 
  WHERE created_at::date IN ('2025-09-10', '2025-09-11')
);

-- Delete related audit logs
DELETE FROM inventory_sync_audit 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE created_at::date IN ('2025-09-10', '2025-09-11')
);

-- Finally, delete the transactions
DELETE FROM transactions 
WHERE created_at::date IN ('2025-09-10', '2025-09-11');

-- Log completion summary
INSERT INTO cleanup_log (
  table_name,
  action,
  details,
  created_at
) VALUES (
  'transactions',
  'bulk_delete',
  jsonb_build_object(
    'deleted_dates', ARRAY['2025-09-10', '2025-09-11'],
    'backup_table', 'deleted_transactions_backup',
    'completion_timestamp', NOW()
  ),
  NOW()
);