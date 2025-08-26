-- Remove all sales data to start fresh
-- Delete in order to respect foreign key constraints

-- Clear BIR audit logs
DELETE FROM public.bir_audit_logs;

-- Clear BIR e-journal entries  
DELETE FROM public.bir_ejournal;

-- Clear BIR cumulative sales
DELETE FROM public.bir_cumulative_sales;

-- Clear store metrics
DELETE FROM public.store_metrics;

-- Clear inventory transactions (linked to transactions)
DELETE FROM public.inventory_transactions WHERE transaction_type = 'sale';

-- Clear transactions (main sales data)
DELETE FROM public.transactions;

-- Clear shifts (cashier shifts)
DELETE FROM public.shifts;

-- Reset any auto-increment sequences if needed
-- Note: Most tables use UUID primary keys, so no sequences to reset