
-- Phase 1: Clean up current commissary inventory
-- Remove all existing commissary inventory items to start fresh
DELETE FROM conversion_ingredients;
DELETE FROM inventory_conversions;
DELETE FROM commissary_purchases;
DELETE FROM commissary_restock_fulfillments;
DELETE FROM commissary_restock_requests;
DELETE FROM commissary_inventory;

-- Reset any sequences if needed
-- This ensures we start with a clean slate for the commissary inventory

-- Verification query to confirm clean state
SELECT COUNT(*) as remaining_items FROM commissary_inventory;
