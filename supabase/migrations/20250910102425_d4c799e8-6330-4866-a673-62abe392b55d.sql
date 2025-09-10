-- Clear all sales data for today for store: d7c47e6b-f20a-4543-a6bd-000398f72df5
-- Store: Sugbo Mercado (Lahug, Cebu)

-- 1. Delete transaction items for today's transactions for this store
DELETE FROM transaction_items 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND DATE(created_at) = CURRENT_DATE
);

-- 2. Delete transactions for today for this store
DELETE FROM transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND DATE(created_at) = CURRENT_DATE;

-- 3. Clear store metrics for today for this store
DELETE FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND metric_date = CURRENT_DATE;

-- 4. Reset BIR cumulative sales for this store (set to 0 but keep the record)
UPDATE bir_cumulative_sales 
SET grand_total_sales = 0,
    grand_total_transactions = 0,
    last_receipt_number = NULL,
    last_transaction_date = NULL,
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- 5. Clear BIR audit logs for today for this store
DELETE FROM bir_audit_logs 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND DATE(created_at) = CURRENT_DATE;

-- 6. Clear BIR ejournal for today for this store
DELETE FROM bir_ejournal 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND journal_date = CURRENT_DATE;

-- 7. Clear inventory sync audit records for today for this store
DELETE FROM inventory_sync_audit 
WHERE DATE(created_at) = CURRENT_DATE;