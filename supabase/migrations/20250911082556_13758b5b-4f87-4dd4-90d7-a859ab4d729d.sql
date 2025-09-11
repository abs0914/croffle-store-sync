-- Clear dashboard sales and orders data for Sugbo Mercado (IT Park, Cebu)
-- Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5

-- Create backup tables for the data we're about to delete
CREATE TABLE IF NOT EXISTS deleted_sugbo_mercado_backup AS
SELECT 
  'transaction' as data_type,
  t.id::text as record_id,
  t.*::jsonb as record_data,
  NOW() as deletion_timestamp,
  'sugbo_mercado_dashboard_clear' as deletion_reason
FROM transactions t
WHERE t.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'

UNION ALL

SELECT 
  'purchase_order' as data_type,
  po.id::text as record_id,
  po.*::jsonb as record_data,
  NOW() as deletion_timestamp,
  'sugbo_mercado_dashboard_clear' as deletion_reason
FROM purchase_orders po
WHERE po.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'

UNION ALL

SELECT 
  'inventory_movement' as data_type,
  im.id::text as record_id,
  im.*::jsonb as record_data,
  NOW() as deletion_timestamp,
  'sugbo_mercado_dashboard_clear' as deletion_reason
FROM inventory_movements im
JOIN inventory_stock ist ON im.inventory_stock_id = ist.id
WHERE ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Log what we're about to delete
DO $$ 
DECLARE
  store_name TEXT := 'Sugbo Mercado (IT Park, Cebu)';
  transaction_count INTEGER;
  total_sales NUMERIC;
  po_count INTEGER;
  po_amount NUMERIC;
  movement_count INTEGER;
BEGIN
  -- Get counts for logging
  SELECT COUNT(*), COALESCE(SUM(total), 0)
  INTO transaction_count, total_sales
  FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO po_count, po_amount
  FROM purchase_orders
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  
  SELECT COUNT(*)
  INTO movement_count
  FROM inventory_movements im
  JOIN inventory_stock ist ON im.inventory_stock_id = ist.id
  WHERE ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  
  RAISE NOTICE 'Clearing data for %: % transactions (₱%), % purchase orders (₱%), % inventory movements', 
    store_name, transaction_count, total_sales, po_count, po_amount, movement_count;
END $$;

-- Delete related inventory movements first
DELETE FROM inventory_movements 
WHERE inventory_stock_id IN (
  SELECT id FROM inventory_stock 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Delete related inventory sync audit logs
DELETE FROM inventory_sync_audit 
WHERE transaction_id IN (
  SELECT id FROM transactions 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Delete delivery orders related to purchase orders for this store
DELETE FROM delivery_orders 
WHERE purchase_order_id IN (
  SELECT id FROM purchase_orders 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
);

-- Delete purchase orders
DELETE FROM purchase_orders 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Delete transactions (sales data)
DELETE FROM transactions 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Log completion
INSERT INTO cleanup_log (
  table_name,
  action,
  details,
  created_at
) VALUES (
  'multiple_tables',
  'store_data_clear',
  jsonb_build_object(
    'store_id', 'd7c47e6b-f20a-4543-a6bd-000398f72df5',
    'store_name', 'Sugbo Mercado (IT Park, Cebu)',
    'backup_table', 'deleted_sugbo_mercado_backup',
    'completion_timestamp', NOW(),
    'reason', 'Dashboard sales and orders data clear requested by admin'
  ),
  NOW()
);