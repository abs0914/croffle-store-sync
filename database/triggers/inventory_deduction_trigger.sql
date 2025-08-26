-- =====================================================
-- AUTOMATIC INVENTORY DEDUCTION SYSTEM
-- =====================================================
-- This file contains the database triggers and functions
-- to automatically deduct inventory when transactions are completed.

-- =====================================================
-- 1. INVENTORY DEDUCTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_deduct_inventory_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    transaction_item RECORD;
    recipe_ingredient RECORD;
    current_stock NUMERIC;
    required_quantity NUMERIC;
    new_quantity NUMERIC;
    movement_id UUID;
BEGIN
    -- Only process completed transactions that weren't previously completed
    IF NEW.status != 'completed' OR (OLD IS NOT NULL AND OLD.status = 'completed') THEN
        RETURN NEW;
    END IF;

    -- Log the trigger execution
    RAISE NOTICE 'Processing inventory deduction for transaction: %', NEW.id;

    -- Process each transaction item
    FOR transaction_item IN 
        SELECT ti.name, ti.quantity, ti.transaction_id
        FROM transaction_items ti
        WHERE ti.transaction_id = NEW.id
    LOOP
        RAISE NOTICE 'Processing item: % (quantity: %)', transaction_item.name, transaction_item.quantity;
        
        -- Find the recipe template for this product
        FOR recipe_ingredient IN
            SELECT rti.ingredient_name, rti.quantity as ingredient_quantity, rti.unit
            FROM recipe_template_ingredients rti
            JOIN recipe_templates rt ON rti.recipe_template_id = rt.id
            WHERE rt.name = transaction_item.name
              AND rt.is_active = true
        LOOP
            RAISE NOTICE 'Processing ingredient: % (required: % %)', 
                recipe_ingredient.ingredient_name, 
                recipe_ingredient.ingredient_quantity, 
                recipe_ingredient.unit;
            
            -- Calculate total required quantity
            required_quantity := recipe_ingredient.ingredient_quantity * transaction_item.quantity;
            
            -- Find the inventory item for this ingredient at this store
            SELECT stock_quantity INTO current_stock
            FROM inventory_stock
            WHERE store_id = NEW.store_id
              AND item = recipe_ingredient.ingredient_name
              AND is_active = true;
            
            IF FOUND THEN
                -- Calculate new quantity (don't go below 0)
                new_quantity := GREATEST(0, current_stock - required_quantity);
                
                RAISE NOTICE 'Updating inventory: % from % to % (deducting %)', 
                    recipe_ingredient.ingredient_name, 
                    current_stock, 
                    new_quantity, 
                    required_quantity;
                
                -- Update the inventory
                UPDATE inventory_stock
                SET stock_quantity = new_quantity,
                    updated_at = NOW()
                WHERE store_id = NEW.store_id
                  AND item = recipe_ingredient.ingredient_name
                  AND is_active = true;
                
                -- Create inventory movement record
                INSERT INTO inventory_transactions (
                    id,
                    store_id,
                    item_name,
                    transaction_type,
                    quantity,
                    previous_quantity,
                    new_quantity,
                    reference_id,
                    notes,
                    created_at
                ) VALUES (
                    gen_random_uuid(),
                    NEW.store_id,
                    recipe_ingredient.ingredient_name,
                    'sale',
                    -required_quantity,
                    current_stock,
                    new_quantity,
                    NEW.id,
                    'Automatic deduction for transaction: ' || NEW.receipt_number,
                    NOW()
                ) RETURNING id INTO movement_id;
                
                RAISE NOTICE 'Created movement record: %', movement_id;
                
            ELSE
                RAISE WARNING 'Inventory item not found: % for store %', 
                    recipe_ingredient.ingredient_name, NEW.store_id;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Completed inventory deduction for transaction: %', NEW.id;
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in inventory deduction for transaction %: %', NEW.id, SQLERRM;
        -- Don't fail the transaction, just log the error
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE THE TRIGGER
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON transactions;

-- Create the trigger
CREATE TRIGGER trg_auto_deduct_inventory
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION auto_deduct_inventory_on_transaction();

-- =====================================================
-- 3. INVENTORY VALIDATION FUNCTION (OPTIONAL)
-- =====================================================

CREATE OR REPLACE FUNCTION validate_inventory_before_transaction(
    p_store_id UUID,
    p_transaction_items JSONB
)
RETURNS TABLE(
    ingredient_name TEXT,
    required_quantity NUMERIC,
    available_quantity NUMERIC,
    sufficient BOOLEAN
) AS $$
DECLARE
    item JSONB;
    recipe_ingredient RECORD;
    current_stock NUMERIC;
    required_qty NUMERIC;
BEGIN
    -- Process each transaction item
    FOR item IN SELECT * FROM jsonb_array_elements(p_transaction_items)
    LOOP
        -- Find recipe ingredients for this item
        FOR recipe_ingredient IN
            SELECT rti.ingredient_name, rti.quantity as ingredient_quantity
            FROM recipe_template_ingredients rti
            JOIN recipe_templates rt ON rti.recipe_template_id = rt.id
            WHERE rt.name = item->>'name'
              AND rt.is_active = true
        LOOP
            -- Calculate required quantity
            required_qty := recipe_ingredient.ingredient_quantity * (item->>'quantity')::NUMERIC;
            
            -- Get current stock
            SELECT stock_quantity INTO current_stock
            FROM inventory_stock
            WHERE store_id = p_store_id
              AND item = recipe_ingredient.ingredient_name
              AND is_active = true;
            
            -- Return validation result
            RETURN QUERY SELECT 
                recipe_ingredient.ingredient_name::TEXT,
                required_qty,
                COALESCE(current_stock, 0),
                COALESCE(current_stock, 0) >= required_qty;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. MANUAL INVENTORY DEDUCTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION manual_deduct_inventory(
    p_transaction_id UUID
)
RETURNS TABLE(
    ingredient_name TEXT,
    previous_quantity NUMERIC,
    deducted_quantity NUMERIC,
    new_quantity NUMERIC,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    transaction_record RECORD;
    transaction_item RECORD;
    recipe_ingredient RECORD;
    current_stock NUMERIC;
    required_quantity NUMERIC;
    new_qty NUMERIC;
BEGIN
    -- Get transaction details
    SELECT * INTO transaction_record
    FROM transactions
    WHERE id = p_transaction_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            'TRANSACTION_NOT_FOUND'::TEXT,
            0::NUMERIC,
            0::NUMERIC,
            0::NUMERIC,
            FALSE,
            'Transaction not found'::TEXT;
        RETURN;
    END IF;
    
    -- Process each transaction item
    FOR transaction_item IN 
        SELECT ti.name, ti.quantity
        FROM transaction_items ti
        WHERE ti.transaction_id = p_transaction_id
    LOOP
        -- Find recipe ingredients
        FOR recipe_ingredient IN
            SELECT rti.ingredient_name, rti.quantity as ingredient_quantity
            FROM recipe_template_ingredients rti
            JOIN recipe_templates rt ON rti.recipe_template_id = rt.id
            WHERE rt.name = transaction_item.name
              AND rt.is_active = true
        LOOP
            required_quantity := recipe_ingredient.ingredient_quantity * transaction_item.quantity;
            
            -- Get current stock
            SELECT stock_quantity INTO current_stock
            FROM inventory_stock
            WHERE store_id = transaction_record.store_id
              AND item = recipe_ingredient.ingredient_name
              AND is_active = true;
            
            IF FOUND THEN
                new_qty := GREATEST(0, current_stock - required_quantity);
                
                -- Update inventory
                UPDATE inventory_stock
                SET stock_quantity = new_qty,
                    updated_at = NOW()
                WHERE store_id = transaction_record.store_id
                  AND item = recipe_ingredient.ingredient_name
                  AND is_active = true;
                
                -- Create movement record
                INSERT INTO inventory_transactions (
                    id,
                    store_id,
                    item_name,
                    transaction_type,
                    quantity,
                    previous_quantity,
                    new_quantity,
                    reference_id,
                    notes,
                    created_at
                ) VALUES (
                    gen_random_uuid(),
                    transaction_record.store_id,
                    recipe_ingredient.ingredient_name,
                    'sale',
                    -required_quantity,
                    current_stock,
                    new_qty,
                    p_transaction_id,
                    'Manual deduction for transaction: ' || transaction_record.receipt_number,
                    NOW()
                );
                
                RETURN QUERY SELECT 
                    recipe_ingredient.ingredient_name::TEXT,
                    current_stock,
                    required_quantity,
                    new_qty,
                    TRUE,
                    NULL::TEXT;
            ELSE
                RETURN QUERY SELECT 
                    recipe_ingredient.ingredient_name::TEXT,
                    0::NUMERIC,
                    required_quantity,
                    0::NUMERIC,
                    FALSE,
                    'Inventory item not found'::TEXT;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to the application user
-- GRANT EXECUTE ON FUNCTION auto_deduct_inventory_on_transaction() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION validate_inventory_before_transaction(UUID, JSONB) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION manual_deduct_inventory(UUID) TO your_app_user;

-- =====================================================
-- 6. ENABLE TRIGGER
-- =====================================================

-- The trigger is automatically enabled when created
-- To disable: ALTER TABLE transactions DISABLE TRIGGER trg_auto_deduct_inventory;
-- To enable: ALTER TABLE transactions ENABLE TRIGGER trg_auto_deduct_inventory;

COMMENT ON FUNCTION auto_deduct_inventory_on_transaction() IS 'Automatically deducts inventory when a transaction is completed';
COMMENT ON FUNCTION validate_inventory_before_transaction(UUID, JSONB) IS 'Validates if sufficient inventory exists before processing a transaction';
COMMENT ON FUNCTION manual_deduct_inventory(UUID) IS 'Manually deducts inventory for a specific transaction';
COMMENT ON TRIGGER trg_auto_deduct_inventory ON transactions IS 'Trigger to automatically deduct inventory when transactions are completed';
