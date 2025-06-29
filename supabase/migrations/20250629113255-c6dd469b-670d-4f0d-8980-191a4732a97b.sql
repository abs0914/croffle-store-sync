
-- Remove all commissary inventory items
-- This will set all items to inactive instead of hard deletion to preserve data integrity
UPDATE commissary_inventory 
SET is_active = false, 
    updated_at = now()
WHERE is_active = true;

-- If you want to completely delete all records (use with caution):
-- DELETE FROM commissary_inventory;

-- Reset the current stock to 0 for all items (alternative approach):
-- UPDATE commissary_inventory 
-- SET current_stock = 0, 
--     updated_at = now()
-- WHERE is_active = true;
