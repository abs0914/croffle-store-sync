-- Simple transaction deletion for September 10th and 11th, 2025

-- Create backup table with transactions to be deleted
CREATE TABLE IF NOT EXISTS deleted_transactions_backup AS
SELECT 
  t.*,
  NOW() as deletion_timestamp,
  'bulk_delete_sept_10_11' as deletion_reason
FROM transactions t
WHERE t.created_at::date IN ('2025-09-10', '2025-09-11');

-- Count what we're about to delete
DO $$ 
DECLARE
  transaction_count INTEGER;
  total_amount NUMERIC;
BEGIN
  -- Get counts for logging
  SELECT COUNT(*), SUM(total) 
  INTO transaction_count, total_amount
  FROM transactions 
  WHERE created_at::date IN ('2025-09-10', '2025-09-11');
  
  RAISE NOTICE 'Deleting % transactions totaling %', transaction_count, total_amount;
END $$;

-- Delete related inventory movements first (if any exist)
DELETE FROM inventory_movements 
WHERE reference_type = 'transaction' 
AND reference_id IN (
  SELECT id FROM transactions 
  WHERE created_at::date IN ('2025-09-10', '2025-09-11')
);

-- Delete related inventory sync audit logs
DELETE FROM inventory_sync_audit 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE created_at::date IN ('2025-09-10', '2025-09-11')
);

-- Delete the transactions
DELETE FROM transactions 
WHERE created_at::date IN ('2025-09-10', '2025-09-11');

-- Log completion in cleanup table
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
    'completion_timestamp', NOW(),
    'reason', 'Admin requested bulk deletion for Sept 10-11'
  ),
  NOW()
);