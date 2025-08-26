-- Remove the problematic auto_deduct_inventory_on_transaction trigger and function
-- This will allow us to revert to frontend-based inventory deduction

-- Drop the trigger first
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON transactions;
DROP TRIGGER IF EXISTS auto_deduct_inventory_on_transaction ON transactions;

-- Drop the function
DROP FUNCTION IF EXISTS auto_deduct_inventory_on_transaction();