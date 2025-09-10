-- Clear Sales Data for Sugbo Mercado (IT Park, Cebu) - September 10, 2025
-- Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5

-- Step 1: Create audit backup of transactions being deleted
CREATE TABLE IF NOT EXISTS temp_deleted_transactions_backup AS
SELECT 
  t.*,
  'CLEARED_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS') as backup_reason,
  now() as backup_timestamp
FROM transactions t
WHERE t.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND DATE(t.created_at AT TIME ZONE 'Asia/Manila') = '2025-09-10'
  AND t.status = 'completed';

-- Step 2: Create audit backup of transaction items being deleted
CREATE TABLE IF NOT EXISTS temp_deleted_transaction_items_backup AS
SELECT 
  ti.*,
  'CLEARED_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS') as backup_reason,
  now() as backup_timestamp
FROM transaction_items ti
JOIN transactions t ON ti.transaction_id = t.id
WHERE t.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND DATE(t.created_at AT TIME ZONE 'Asia/Manila') = '2025-09-10'
  AND t.status = 'completed';

-- Step 3: Get current cumulative totals before cleanup
DO $$
DECLARE
  current_total_sales NUMERIC;
  current_total_transactions BIGINT;
  sales_to_deduct NUMERIC;
  transactions_to_deduct INTEGER;
BEGIN
  -- Get current cumulative totals
  SELECT grand_total_sales, grand_total_transactions 
  INTO current_total_sales, current_total_transactions
  FROM bir_cumulative_sales 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  
  -- Calculate today's totals to deduct
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO sales_to_deduct, transactions_to_deduct
  FROM transactions
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND DATE(created_at AT TIME ZONE 'Asia/Manila') = '2025-09-10'
    AND status = 'completed';
  
  RAISE NOTICE 'Current totals - Sales: %, Transactions: %', current_total_sales, current_total_transactions;
  RAISE NOTICE 'Deducting - Sales: %, Transactions: %', sales_to_deduct, transactions_to_deduct;
END $$;

-- Step 4: Delete transaction items first (due to foreign key constraints)
DELETE FROM transaction_items
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND DATE(created_at AT TIME ZONE 'Asia/Manila') = '2025-09-10'
    AND status = 'completed'
);

-- Step 5: Delete transactions
DELETE FROM transactions
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND DATE(created_at AT TIME ZONE 'Asia/Manila') = '2025-09-10'
  AND status = 'completed';

-- Step 6: Update BIR cumulative sales
UPDATE bir_cumulative_sales 
SET 
  grand_total_sales = grand_total_sales - (
    SELECT COALESCE(SUM(total), 0)
    FROM temp_deleted_transactions_backup
  ),
  grand_total_transactions = grand_total_transactions - (
    SELECT COUNT(*)
    FROM temp_deleted_transactions_backup
  ),
  -- Update last transaction info to most recent remaining transaction
  last_receipt_number = COALESCE((
    SELECT receipt_number 
    FROM transactions 
    WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
      AND status = 'completed'
    ORDER BY created_at DESC 
    LIMIT 1
  ), last_receipt_number),
  last_transaction_date = COALESCE((
    SELECT created_at 
    FROM transactions 
    WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
      AND status = 'completed'
    ORDER BY created_at DESC 
    LIMIT 1
  ), last_transaction_date),
  updated_at = now()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Step 7: Clean up any inventory sync audit logs for today's transactions
DELETE FROM inventory_sync_audit
WHERE transaction_id IN (
  SELECT id FROM temp_deleted_transactions_backup
);

-- Step 8: Clean up any BIR audit logs for today's transactions
DELETE FROM bir_audit_logs
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND transaction_id IN (
    SELECT id FROM temp_deleted_transactions_backup
  );

-- Step 9: Verification query to confirm cleanup
DO $$
DECLARE
  remaining_transactions INTEGER;
  updated_cumulative_sales NUMERIC;
  updated_cumulative_transactions BIGINT;
BEGIN
  -- Check remaining transactions for today
  SELECT COUNT(*)
  INTO remaining_transactions
  FROM transactions
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND DATE(created_at AT TIME ZONE 'Asia/Manila') = '2025-09-10'
    AND status = 'completed';
  
  -- Get updated cumulative totals
  SELECT grand_total_sales, grand_total_transactions
  INTO updated_cumulative_sales, updated_cumulative_transactions
  FROM bir_cumulative_sales
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  
  RAISE NOTICE 'CLEANUP COMPLETE:';
  RAISE NOTICE 'Remaining transactions for today: %', remaining_transactions;
  RAISE NOTICE 'Updated cumulative sales: %', updated_cumulative_sales;
  RAISE NOTICE 'Updated cumulative transactions: %', updated_cumulative_transactions;
  RAISE NOTICE 'Backup tables created: temp_deleted_transactions_backup, temp_deleted_transaction_items_backup';
END $$;