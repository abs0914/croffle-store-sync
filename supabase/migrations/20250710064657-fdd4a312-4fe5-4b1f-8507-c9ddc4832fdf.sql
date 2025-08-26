-- One-time cleanup of all auto-generated stock orders
-- These orders appear to be spam/unwanted and are causing notification issues

-- Delete stock order items first (foreign key constraint)
DELETE FROM public.stock_order_items 
WHERE stock_order_id IN (
  SELECT id FROM public.stock_orders 
  WHERE order_number LIKE 'AUTO-%' 
     OR notes ILIKE '%auto-generated%'
);

-- Delete the auto-generated stock orders
DELETE FROM public.stock_orders 
WHERE order_number LIKE 'AUTO-%' 
   OR notes ILIKE '%auto-generated%';

-- Verify cleanup completed
SELECT 
  (SELECT COUNT(*) FROM public.stock_orders WHERE order_number LIKE 'AUTO-%') as remaining_auto_orders,
  (SELECT COUNT(*) FROM public.stock_orders) as total_orders;