-- Delete all sales data for Sugbo Mercado (IT Park, Cebu)
-- Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5

-- Delete transaction items first (foreign key dependency)
DELETE FROM transaction_items 
WHERE transaction_id IN (
    SELECT id FROM transactions 
    WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Delete transactions
DELETE FROM transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Delete any BIR audit logs for this store
DELETE FROM bir_audit_logs 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Delete any BIR cumulative sales for this store
DELETE FROM bir_cumulative_sales 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Delete any BIR ejournal entries for this store
DELETE FROM bir_ejournal 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Reset store metrics if any
DELETE FROM store_metrics 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';