-- Clean up conflicting transaction triggers to fix scalar extraction error

-- 1. Drop the problematic trigger and function causing the scalar error
DROP TRIGGER IF EXISTS trigger_transaction_inventory_deduction ON transactions;
DROP FUNCTION IF EXISTS process_transaction_inventory_deduction();

-- 2. Drop redundant validation trigger
DROP TRIGGER IF EXISTS trigger_validate_transaction_inventory ON transactions;
DROP FUNCTION IF EXISTS validate_transaction_inventory_sync();

-- 3. Create the main inventory deduction trigger using the fixed function
CREATE TRIGGER trg_auto_deduct_inventory
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION auto_deduct_inventory_on_transaction();

-- 4. Ensure we keep the essential triggers (these should already exist)
-- trigger_update_cumulative_sales - for BIR compliance
-- No need to recreate as they should be working fine