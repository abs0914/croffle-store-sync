-- Delete all transactions and related data for Sept 21, 2025 for Sugbo Mercado (IT Park, Cebu)
-- Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5

-- First delete related transaction items to avoid foreign key constraints
DELETE FROM transaction_items 
WHERE transaction_id IN (
    SELECT id FROM transactions 
    WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
    AND DATE(created_at) = '2025-09-21'
);

-- Delete any void transactions for the same date/store
DELETE FROM void_transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
AND DATE(created_at) = '2025-09-21';

-- Delete any BIR audit logs for these transactions
DELETE FROM bir_audit_logs 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
AND DATE(created_at) = '2025-09-21';

-- Delete the main transactions
DELETE FROM transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
AND DATE(created_at) = '2025-09-21';

-- Update any daily summaries that might be affected
DELETE FROM bir_daily_summary 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
AND business_date = '2025-09-21';

-- Log the cleanup action
INSERT INTO cleanup_log (action, table_name, details) VALUES 
('DELETE_DAILY_TRANSACTIONS', 'transactions', 
 jsonb_build_object(
   'store_id', 'd7c47e6b-f20a-4543-a6bd-000398f72df5',
   'store_name', 'Sugbo Mercado (IT Park, Cebu)',
   'date', '2025-09-21',
   'reason', 'User requested deletion of all transactions for Sept 21, 2025'
 ));