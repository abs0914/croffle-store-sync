
-- Phase 1: Clear all commissary inventory and purchase data for fresh start

-- First, delete all purchase records (they reference commissary_inventory)
DELETE FROM commissary_purchases;

-- Then delete all commissary inventory items
DELETE FROM commissary_inventory;

-- Verification queries to confirm clean state
SELECT COUNT(*) as commissary_inventory_count FROM commissary_inventory;
SELECT COUNT(*) as commissary_purchases_count FROM commissary_purchases;
