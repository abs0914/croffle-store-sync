
-- Reactivate finished products (orderable_items) that should be available for ordering
UPDATE commissary_inventory 
SET is_active = true, 
    updated_at = NOW()
WHERE item_type = 'orderable_item' 
  AND is_active = false;

-- Ensure orderable items have reasonable stock levels for ordering
UPDATE commissary_inventory 
SET current_stock = GREATEST(current_stock, 10),
    minimum_threshold = GREATEST(minimum_threshold, 5),
    updated_at = NOW()
WHERE item_type = 'orderable_item' 
  AND current_stock <= 0;
