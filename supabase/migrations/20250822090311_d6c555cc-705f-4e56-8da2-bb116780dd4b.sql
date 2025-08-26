-- Manually trigger inventory sync for the two failed transactions
-- This will deduct the proper inventory based on the corrected recipe ingredients

-- Function to sync inventory for a specific transaction
DO $$
DECLARE
    transaction_record RECORD;
    transaction_item RECORD;
    recipe_record RECORD;
    ingredient_record RECORD;
    inventory_record RECORD;
BEGIN
    -- Process each transaction
    FOR transaction_record IN 
        SELECT id, receipt_number, store_id
        FROM transactions 
        WHERE receipt_number IN ('20250822-0842-151217', '20250822-8966-151346')
          AND status = 'completed'
    LOOP
        RAISE NOTICE 'Processing transaction: %', transaction_record.receipt_number;
        
        -- Process each item in the transaction
        FOR transaction_item IN
            SELECT ti.*, p.recipe_id
            FROM transaction_items ti
            LEFT JOIN products p ON ti.product_id = p.id
            WHERE ti.transaction_id = transaction_record.id
        LOOP
            RAISE NOTICE 'Processing item: % (qty: %)', transaction_item.name, transaction_item.quantity;
            
            -- If product has a recipe, deduct ingredients from inventory
            IF transaction_item.recipe_id IS NOT NULL THEN
                FOR ingredient_record IN
                    SELECT ri.ingredient_name, ri.quantity as recipe_qty, ri.unit
                    FROM recipe_ingredients ri
                    WHERE ri.recipe_id = transaction_item.recipe_id
                LOOP
                    -- Calculate total quantity needed (recipe qty * transaction qty)
                    DECLARE
                        total_qty_needed NUMERIC := ingredient_record.recipe_qty * transaction_item.quantity;
                    BEGIN
                        -- Find inventory item
                        SELECT * INTO inventory_record
                        FROM inventory_stock 
                        WHERE store_id = transaction_record.store_id
                          AND UPPER(item) = UPPER(ingredient_record.ingredient_name)
                          AND unit = ingredient_record.unit
                          AND is_active = true
                        LIMIT 1;
                        
                        IF FOUND THEN
                            -- Check if enough stock
                            IF inventory_record.stock_quantity >= total_qty_needed THEN
                                -- Deduct from inventory
                                UPDATE inventory_stock 
                                SET stock_quantity = stock_quantity - total_qty_needed,
                                    updated_at = NOW()
                                WHERE id = inventory_record.id;
                                
                                -- Log the inventory transaction
                                INSERT INTO inventory_transactions (
                                    store_id,
                                    product_id,
                                    transaction_type,
                                    quantity,
                                    previous_quantity,
                                    new_quantity,
                                    notes,
                                    reference_id,
                                    created_at
                                ) VALUES (
                                    transaction_record.store_id,
                                    inventory_record.id,
                                    'sale',
                                    total_qty_needed,
                                    inventory_record.stock_quantity + total_qty_needed,
                                    inventory_record.stock_quantity,
                                    'Manual inventory sync for transaction: ' || transaction_record.receipt_number,
                                    transaction_record.id::TEXT,
                                    NOW()
                                );
                                
                                RAISE NOTICE 'Deducted % % of % from inventory', total_qty_needed, ingredient_record.unit, ingredient_record.ingredient_name;
                            ELSE
                                RAISE NOTICE 'Insufficient stock for %: needed %, have %', ingredient_record.ingredient_name, total_qty_needed, inventory_record.stock_quantity;
                            END IF;
                        ELSE
                            RAISE NOTICE 'Inventory item not found: % (%)', ingredient_record.ingredient_name, ingredient_record.unit;
                        END IF;
                    END;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Inventory sync completed for transactions';
END $$;