
-- Update all orderable items to have a stock quantity of 20
UPDATE commissary_inventory 
SET current_stock = 20,
    updated_at = NOW()
WHERE item_type = 'orderable_item' 
  AND is_active = true;
