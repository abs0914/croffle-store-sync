-- Remove all sales data for today from store_metrics table for Sugbo Mercado
-- Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5

DELETE FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND metric_date = '2025-09-10';

-- Drop the temporary backup tables since backups are not needed
DROP TABLE IF EXISTS temp_deleted_transactions_backup;
DROP TABLE IF EXISTS temp_deleted_transaction_items_backup;
DROP TABLE IF EXISTS temp_deleted_inventory_sync_backup;

-- Verify cleanup
SELECT 
  'store_metrics' as table_name,
  COUNT(*) as remaining_records
FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND metric_date = '2025-09-10'

UNION ALL

SELECT 
  'transactions' as table_name,
  COUNT(*) as remaining_records
FROM transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND DATE(created_at AT TIME ZONE 'Asia/Manila') = '2025-09-10';

-- Show final BIR cumulative totals
SELECT 
  'bir_cumulative_sales' as info,
  grand_total_sales,
  grand_total_transactions
FROM bir_cumulative_sales 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';