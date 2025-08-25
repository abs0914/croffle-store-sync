-- Create storage bucket for product images and setup automatic inventory deduction

-- Create product images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING; 

-- Create RLS policies for product images bucket
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Create function for automatic inventory deduction on transaction completion
CREATE OR REPLACE FUNCTION process_transaction_inventory_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
    transaction_items JSONB;
    item_record RECORD;
    recipe_record RECORD;
    ingredient_record RECORD;
    inventory_item RECORD;
    required_quantity NUMERIC;
    current_stock NUMERIC;
    new_stock NUMERIC;
BEGIN
    -- Only process when transaction status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Parse transaction items
        IF NEW.items IS NOT NULL THEN
            -- Handle both JSON string and JSONB
            IF jsonb_typeof(NEW.items) = 'string' THEN
                transaction_items := to_jsonb(NEW.items::text);
            ELSE
                transaction_items := NEW.items;
            END IF;
            
            -- Process each item in the transaction
            FOR item_record IN 
                SELECT * FROM jsonb_array_elements(transaction_items) AS item
            LOOP
                -- Find recipe for this product name
                SELECT rt.id, rt.name INTO recipe_record
                FROM recipe_templates rt
                WHERE LOWER(rt.name) = LOWER(item_record.item->>'name')
                  AND rt.is_active = true
                LIMIT 1;
                
                IF recipe_record.id IS NOT NULL THEN
                    -- Process each ingredient in the recipe
                    FOR ingredient_record IN 
                        SELECT ingredient_name, quantity, unit
                        FROM recipe_template_ingredients 
                        WHERE recipe_template_id = recipe_record.id
                    LOOP
                        -- Calculate required quantity
                        required_quantity := ingredient_record.quantity * COALESCE((item_record.item->>'quantity')::NUMERIC, 1);
                        
                        -- Find matching inventory item (exact match first)
                        SELECT id, current_stock INTO inventory_item
                        FROM inventory_stock 
                        WHERE store_id = NEW.store_id
                          AND is_active = true
                          AND LOWER(TRIM(item)) = LOWER(TRIM(ingredient_record.ingredient_name))
                        LIMIT 1;
                        
                        -- If no exact match, try partial match
                        IF inventory_item.id IS NULL THEN
                            SELECT id, current_stock INTO inventory_item
                            FROM inventory_stock 
                            WHERE store_id = NEW.store_id
                              AND is_active = true
                              AND (LOWER(item) LIKE '%' || LOWER(TRIM(ingredient_record.ingredient_name)) || '%'
                                   OR LOWER(TRIM(ingredient_record.ingredient_name)) LIKE '%' || LOWER(item) || '%')
                            LIMIT 1;
                        END IF;
                        
                        -- If inventory item found, deduct stock
                        IF inventory_item.id IS NOT NULL THEN
                            current_stock := COALESCE(inventory_item.current_stock, 0);
                            new_stock := GREATEST(0, current_stock - required_quantity);
                            
                            -- Update inventory stock
                            UPDATE inventory_stock 
                            SET current_stock = new_stock,
                                updated_at = NOW()
                            WHERE id = inventory_item.id;
                            
                            -- Log inventory movement
                            INSERT INTO inventory_movements (
                                inventory_stock_id,
                                movement_type,
                                quantity_change,
                                previous_quantity,
                                new_quantity,
                                notes,
                                created_by
                            ) VALUES (
                                inventory_item.id,
                                'sale_deduction',
                                -required_quantity,
                                current_stock,
                                new_stock,
                                'Automatic deduction for transaction ' || NEW.receipt_number || ' - ' || (item_record.item->>'name'),
                                'automatic_system'
                            );
                        END IF;
                    END LOOP;
                END IF;
            END LOOP;
            
            -- Log successful inventory sync
            INSERT INTO inventory_sync_audit (
                transaction_id,
                sync_status,
                items_processed,
                sync_duration_ms,
                created_at
            ) VALUES (
                NEW.id,
                'success',
                jsonb_array_length(transaction_items),
                0,
                NOW()
            ) ON CONFLICT (transaction_id) DO UPDATE SET
                sync_status = 'success',
                items_processed = jsonb_array_length(transaction_items),
                created_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic inventory deduction
DROP TRIGGER IF EXISTS trigger_transaction_inventory_deduction ON transactions;
CREATE TRIGGER trigger_transaction_inventory_deduction
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION process_transaction_inventory_deduction();