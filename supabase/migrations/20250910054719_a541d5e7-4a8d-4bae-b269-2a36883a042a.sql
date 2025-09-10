-- Fix UUID casting in manual_deduct_inventory function
CREATE OR REPLACE FUNCTION public.manual_deduct_inventory(p_transaction_id uuid)
 RETURNS TABLE(ingredient_name text, previous_quantity numeric, deducted_quantity numeric, new_quantity numeric, success boolean, error_message text)
 LANGUAGE plpgsql
AS $function$
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
                
                -- Create movement record with proper UUID casting
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
                    p_transaction_id,  -- Now properly typed as UUID
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
$function$;