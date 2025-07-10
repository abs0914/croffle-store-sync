-- Clear all store inventory and product catalog data for fresh start
-- Delete in order to respect foreign key constraints

-- Clear product ingredients first (references product_catalog)
DELETE FROM public.product_ingredients;

-- Clear product catalog
DELETE FROM public.product_catalog;

-- Clear inventory transactions (references inventory_stock)
DELETE FROM public.inventory_transactions WHERE product_id IN (SELECT id FROM public.inventory_stock);

-- Clear inventory movements (references inventory_stock)
DELETE FROM public.inventory_movements;

-- Clear store inventory alerts (references inventory_stock)
DELETE FROM public.store_inventory_alerts;

-- Clear inventory stock
DELETE FROM public.inventory_stock;

-- Verification queries to confirm clean state
SELECT 
  (SELECT COUNT(*) FROM inventory_stock) as inventory_stock_count,
  (SELECT COUNT(*) FROM product_catalog) as product_catalog_count,
  (SELECT COUNT(*) FROM product_ingredients) as product_ingredients_count,
  (SELECT COUNT(*) FROM inventory_transactions) as inventory_transactions_count,
  (SELECT COUNT(*) FROM inventory_movements) as inventory_movements_count;