-- Add 10 units to all commissary inventory items
UPDATE commissary_inventory 
SET current_stock = current_stock + 10,
    updated_at = now()
WHERE is_active = true;