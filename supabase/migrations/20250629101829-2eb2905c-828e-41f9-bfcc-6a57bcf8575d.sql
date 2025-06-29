
-- Check if there are any items in commissary_inventory table
SELECT 
  id,
  name,
  category,
  item_type,
  current_stock,
  is_active,
  created_at
FROM commissary_inventory 
ORDER BY created_at DESC
LIMIT 10;

-- Check the structure and constraints of the table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'commissary_inventory' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any items with orderable_item type specifically
SELECT COUNT(*) as total_items,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_items,
       COUNT(CASE WHEN item_type = 'orderable_item' THEN 1 END) as orderable_items,
       COUNT(CASE WHEN item_type = 'orderable_item' AND is_active = true THEN 1 END) as active_orderable_items
FROM commissary_inventory;
