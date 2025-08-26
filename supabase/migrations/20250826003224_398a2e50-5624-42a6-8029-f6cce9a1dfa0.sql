-- Fix the auto_deduct_inventory_on_transaction function to actually deduct inventory
CREATE OR REPLACE FUNCTION auto_deduct_inventory_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    transaction_item RECORD;
    recipe_ingredient RECORD;
    inventory_item RECORD;
    current_stock NUMERIC;
    required_quantity NUMERIC;
BEGIN
    -- Only process completed transactions
    IF NEW.status != 'completed' OR (OLD IS NOT NULL AND OLD.status = 'completed') THEN
        RETURN NEW;
    END IF;

    -- Log the trigger execution
    RAISE NOTICE 'Processing inventory deduction for transaction: %', NEW.id;

    -- Process each item in the transaction
    FOR transaction_item IN 
        SELECT ti.*, pc.recipe_id, pc.product_name
        FROM transaction_items ti
        LEFT JOIN product_catalog pc ON pc.id = ti.product_id
        WHERE ti.transaction_id = NEW.id
    LOOP
        -- Skip items without recipes
        IF transaction_item.recipe_id IS NULL THEN
            RAISE NOTICE 'Skipping item % - no recipe found', transaction_item.product_name;
            CONTINUE;
        END IF;

        -- Process each ingredient in the recipe
        FOR recipe_ingredient IN
            SELECT ri.*, rim.inventory_stock_id, rim.conversion_factor
            FROM recipe_ingredients ri
            LEFT JOIN recipe_ingredient_mappings rim ON (
                rim.recipe_id = ri.recipe_id 
                AND rim.ingredient_name = ri.ingredient_name
            )
            WHERE ri.recipe_id = transaction_item.recipe_id
        LOOP
            -- Calculate required quantity (recipe quantity * transaction item quantity * conversion factor)
            required_quantity := recipe_ingredient.quantity * 
                               transaction_item.quantity * 
                               COALESCE(recipe_ingredient.conversion_factor, 1.0);

            -- Find inventory item (by mapping or name match)
            IF recipe_ingredient.inventory_stock_id IS NOT NULL THEN
                -- Use mapped inventory item
                SELECT * INTO inventory_item
                FROM inventory_stock 
                WHERE id = recipe_ingredient.inventory_stock_id 
                  AND store_id = NEW.store_id 
                  AND is_active = true;
            ELSE
                -- Try to find by name match
                SELECT * INTO inventory_item
                FROM inventory_stock 
                WHERE store_id = NEW.store_id 
                  AND is_active = true
                  AND (
                    LOWER(TRIM(item)) = LOWER(TRIM(recipe_ingredient.ingredient_name))
                    OR LOWER(TRIM(item)) LIKE '%' || LOWER(TRIM(recipe_ingredient.ingredient_name)) || '%'
                  )
                ORDER BY 
                  CASE 
                    WHEN LOWER(TRIM(item)) = LOWER(TRIM(recipe_ingredient.ingredient_name)) THEN 1
                    ELSE 2
                  END
                LIMIT 1;
            END IF;

            -- Deduct inventory if item found
            IF inventory_item.id IS NOT NULL THEN
                -- Check current stock
                current_stock := inventory_item.current_stock;
                
                IF current_stock >= required_quantity THEN
                    -- Deduct from inventory
                    UPDATE inventory_stock 
                    SET 
                        current_stock = current_stock - required_quantity,
                        updated_at = NOW()
                    WHERE id = inventory_item.id;

                    -- Log the inventory movement
                    INSERT INTO inventory_movements (
                        store_id,
                        inventory_stock_id,
                        movement_type,
                        quantity,
                        transaction_reference,
                        notes,
                        created_by,
                        created_at
                    ) VALUES (
                        NEW.store_id,
                        inventory_item.id,
                        'sale',
                        -required_quantity, -- Negative for deduction
                        'Transaction: ' || NEW.receipt_number,
                        'Auto-deducted for recipe ingredient: ' || recipe_ingredient.ingredient_name,
                        NEW.created_by,
                        NOW()
                    );

                    RAISE NOTICE 'Deducted % % of % for transaction %', 
                        required_quantity, inventory_item.unit, inventory_item.item, NEW.receipt_number;
                ELSE
                    -- Log insufficient stock warning
                    RAISE WARNING 'Insufficient stock for %: need %, have %', 
                        inventory_item.item, required_quantity, current_stock;
                END IF;
            ELSE
                RAISE NOTICE 'No inventory item found for ingredient: %', recipe_ingredient.ingredient_name;
            END IF;
        END LOOP;
    END LOOP;

    -- Log completion
    INSERT INTO inventory_sync_audit (
        transaction_id,
        sync_status,
        items_processed,
        created_at
    ) VALUES (
        NEW.id,
        'completed',
        (SELECT COUNT(*) FROM transaction_items WHERE transaction_id = NEW.id),
        NOW()
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the transaction
        RAISE WARNING 'Error in inventory deduction for transaction %: %', NEW.id, SQLERRM;
        
        INSERT INTO inventory_sync_audit (
            transaction_id,
            sync_status,
            error_details,
            created_at
        ) VALUES (
            NEW.id,
            'error',
            SQLERRM,
            NOW()
        );
        
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;