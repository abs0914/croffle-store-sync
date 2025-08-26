-- Fixed inventory sync with proper type casting for unit enum
DO $$
DECLARE
    transaction_record RECORD;
    transaction_item RECORD;
    ingredient_record RECORD;
    inventory_record RECORD;
    total_qty_needed NUMERIC;
BEGIN
    RAISE NOTICE 'Starting corrected inventory sync for failed transactions';
    
    -- Process the specific transactions with corrected product links
    FOR transaction_record IN 
        SELECT id, receipt_number, store_id
        FROM transactions 
        WHERE receipt_number IN ('20250822-0842-151217', '20250822-8966-151346')
          AND status = 'completed'
    LOOP
        RAISE NOTICE 'Processing transaction: % for store: %', transaction_record.receipt_number, transaction_record.store_id;
        
        -- Process each item in the transaction (should now have correct product_id)
        FOR transaction_item IN
            SELECT ti.*, p.recipe_id, p.name as product_name
            FROM transaction_items ti
            JOIN products p ON ti.product_id = p.id  -- Using JOIN to ensure we have matching products
            WHERE ti.transaction_id = transaction_record.id
        LOOP
            RAISE NOTICE 'Processing item: % (qty: %, recipe_id: %)', transaction_item.product_name, transaction_item.quantity, transaction_item.recipe_id;
            
            -- Process recipe ingredients
            IF transaction_item.recipe_id IS NOT NULL THEN
                FOR ingredient_record IN
                    SELECT ri.ingredient_name, ri.quantity as recipe_qty, ri.unit
                    FROM recipe_ingredients ri
                    WHERE ri.recipe_id = transaction_item.recipe_id
                LOOP
                    total_qty_needed := ingredient_record.recipe_qty * transaction_item.quantity;
                    RAISE NOTICE 'Processing ingredient: % - Need: % %', ingredient_record.ingredient_name, total_qty_needed, ingredient_record.unit;
                    
                    -- Find matching inventory item with proper type casting
                    SELECT * INTO inventory_record
                    FROM inventory_stock 
                    WHERE store_id = transaction_record.store_id
                      AND UPPER(TRIM(item)) = UPPER(TRIM(ingredient_record.ingredient_name))
                      AND unit::text = ingredient_record.unit  -- Cast enum to text for comparison
                      AND is_active = true
                    LIMIT 1;
                    
                    IF FOUND THEN
                        RAISE NOTICE 'Found inventory: % (current stock: %)', inventory_record.item, inventory_record.stock_quantity;
                        
                        IF inventory_record.stock_quantity >= total_qty_needed THEN
                            -- Update inventory
                            UPDATE inventory_stock 
                            SET stock_quantity = stock_quantity - total_qty_needed,
                                updated_at = NOW()
                            WHERE id = inventory_record.id;
                            
                            -- Log transaction
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
                                inventory_record.stock_quantity,
                                inventory_record.stock_quantity - total_qty_needed,
                                'CORRECTED: Manual inventory sync for transaction: ' || transaction_record.receipt_number || ' - ' || ingredient_record.ingredient_name,
                                transaction_record.id::TEXT,
                                NOW()
                            );
                            
                            RAISE NOTICE 'SUCCESS: Deducted % % of % from inventory (remaining: %)', 
                                total_qty_needed, ingredient_record.unit, ingredient_record.ingredient_name, 
                                (inventory_record.stock_quantity - total_qty_needed);
                        ELSE
                            RAISE NOTICE 'INSUFFICIENT STOCK: % - needed: %, available: %', 
                                ingredient_record.ingredient_name, total_qty_needed, inventory_record.stock_quantity;
                        END IF;
                    ELSE
                        RAISE NOTICE 'INVENTORY NOT FOUND: % (%) - checking available items...', ingredient_record.ingredient_name, ingredient_record.unit;
                        -- Debug: show available items
                        FOR inventory_record IN
                            SELECT item, unit::text as unit_text FROM inventory_stock 
                            WHERE store_id = transaction_record.store_id 
                              AND is_active = true
                              AND UPPER(item) LIKE '%WHIPPED%'
                        LOOP
                            RAISE NOTICE 'Available: % (%)', inventory_record.item, inventory_record.unit_text;
                        END LOOP;
                    END IF;
                END LOOP;
            ELSE
                RAISE NOTICE 'No recipe found for product: %', transaction_item.product_name;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Corrected inventory sync completed successfully';
END $$;