-- Clean up all conflicting transaction triggers to fix scalar extraction error

-- 1. Drop ALL existing inventory-related triggers to start clean
DROP TRIGGER IF EXISTS trigger_transaction_inventory_deduction ON transactions;
DROP TRIGGER IF EXISTS trigger_validate_transaction_inventory ON transactions;
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON transactions;
DROP TRIGGER IF EXISTS auto_deduct_inventory_on_transaction ON transactions;

-- 2. Drop the problematic functions
DROP FUNCTION IF EXISTS process_transaction_inventory_deduction();
DROP FUNCTION IF EXISTS validate_transaction_inventory_sync();

-- 3. Now create the single, clean inventory deduction trigger
CREATE TRIGGER trg_auto_deduct_inventory
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION auto_deduct_inventory_on_transaction();