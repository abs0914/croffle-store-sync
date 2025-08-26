-- Fix the auto_deduct_inventory_on_transaction trigger function
-- to properly handle JSON data and prevent transaction failures

CREATE OR REPLACE FUNCTION public.auto_deduct_inventory_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    item_record RECORD;
    transaction_items JSONB;
    ingredient_record RECORD;
    required_qty NUMERIC;
    current_stock NUMERIC;
    error_msg TEXT;
BEGIN
    -- Only process completed transactions
    IF NEW.status != 'completed' OR (OLD.status IS NOT NULL AND OLD.status = 'completed') THEN
        RETURN NEW;
    END IF;

    BEGIN
        -- Handle items column - it might be stored as text or jsonb
        IF NEW.items IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Convert items to JSONB safely
        BEGIN
            IF pg_typeof(NEW.items) = 'text'::regtype THEN
                transaction_items := NEW.items::jsonb;
            ELSE
                transaction_items := NEW.items::jsonb;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- If JSON parsing fails, log warning but don't fail transaction
            RAISE WARNING 'Failed to parse transaction items as JSON for transaction %: %', NEW.id, NEW.items;
            RETURN NEW;
        END;
        
        -- Ensure items is an array
        IF NOT jsonb_typeof(transaction_items) = 'array' THEN
            RAISE WARNING 'Transaction items is not an array for transaction %', NEW.id;
            RETURN NEW;
        END IF;
        
        -- Process each transaction item safely
        FOR item_record IN 
            SELECT * FROM jsonb_array_elements(transaction_items) AS item
        LOOP
            BEGIN
                -- Validate item structure
                IF NOT (item_record.item ? 'name' AND item_record.item ? 'quantity') THEN
                    RAISE WARNING 'Invalid item structure in transaction %: %', NEW.id, item_record.item;
                    CONTINUE;
                END IF;

                -- Get recipe ingredients for this product
                FOR ingredient_record IN
                    SELECT 
                        rti.ingredient_name,
                        rti.quantity as ingredient_quantity,
                        rti.unit
                    FROM recipes r
                    JOIN recipe_template_ingredients rti ON r.template_id = rti.recipe_template_id
                    WHERE r.store_id = NEW.store_id
                    AND LOWER(TRIM(r.name)) = LOWER(TRIM((item_record.item->>'name')::text))
                    AND r.is_active = true
                LOOP
                    BEGIN
                        -- Calculate required quantity safely
                        required_qty := COALESCE(ingredient_record.ingredient_quantity, 0) * 
                                      COALESCE((item_record.item->>'quantity')::numeric, 0);
                        
                        -- Skip if no quantity needed
                        IF required_qty <= 0 THEN
                            CONTINUE;
                        END IF;
                        
                        -- Find matching inventory item and deduct safely
                        UPDATE inventory_stock 
                        SET 
                            current_stock = GREATEST(0, current_stock - required_qty),
                            updated_at = NOW()
                        WHERE store_id = NEW.store_id
                        AND is_active = true
                        AND (
                            LOWER(TRIM(item)) = LOWER(TRIM(ingredient_record.ingredient_name))
                            OR LOWER(TRIM(item)) LIKE '%' || LOWER(TRIM(ingredient_record.ingredient_name)) || '%'
                        )
                        AND current_stock >= required_qty;
                        
                    EXCEPTION WHEN OTHERS THEN
                        -- Log individual ingredient processing errors but continue
                        RAISE WARNING 'Failed to deduct inventory for ingredient % in transaction %: %', 
                                    ingredient_record.ingredient_name, NEW.id, SQLERRM;
                    END;
                END LOOP;
                
            EXCEPTION WHEN OTHERS THEN
                -- Log individual item processing errors but continue
                RAISE WARNING 'Failed to process item % in transaction %: %', 
                            item_record.item->>'name', NEW.id, SQLERRM;
            END;
        END LOOP;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log general errors but don't fail the transaction
        error_msg := SQLERRM;
        RAISE WARNING 'Auto inventory deduction failed for transaction % (but transaction will proceed): %', NEW.id, error_msg;
        
        -- Store the error in a way that doesn't fail the transaction
        BEGIN
            INSERT INTO inventory_sync_audit (
                transaction_id,
                sync_status,
                error_details,
                items_processed,
                sync_duration_ms,
                created_at
            ) VALUES (
                NEW.id,
                'failed',
                'Auto inventory deduction error: ' || error_msg,
                0,
                0,
                NOW()
            );
        EXCEPTION WHEN OTHERS THEN
            -- Even logging failed, but we still don't want to fail the transaction
            RAISE WARNING 'Failed to log inventory sync error for transaction %', NEW.id;
        END;
    END;
    
    RETURN NEW;
END;
$function$;