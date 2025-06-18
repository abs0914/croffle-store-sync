
-- Clear all inventory stock items across all stores
DELETE FROM inventory_transactions;
DELETE FROM inventory_stock;

-- Verification query to confirm clean state
SELECT 
  (SELECT COUNT(*) FROM inventory_stock) as inventory_stock_count,
  (SELECT COUNT(*) FROM inventory_transactions) as inventory_transactions_count;
