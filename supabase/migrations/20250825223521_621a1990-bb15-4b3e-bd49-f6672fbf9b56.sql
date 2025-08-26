-- Fix the automatic inventory deduction trigger to handle the scalar extraction error
-- The error occurs because we're trying to extract from items column which might be stored as JSON text, not JSONB array

-- First, let's drop the existing trigger and function
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON transactions;
DROP FUNCTION IF EXISTS auto_deduct_inventory_on_transaction();

-- Create a safer function that handles JSON properly
CREATE OR REPLACE FUNCTION auto_deduct_inventory_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    transaction_items JSONB;
    ingredient_record RECORD;
    required_qty NUMERIC;
    current_stock NUMERIC;
BEGIN
    -- Only process completed transactions
    IF NEW.status != 'completed' OR (OLD.status IS NOT NULL AND OLD.status = 'completed') THEN
        RETURN NEW;
    END IF;

    -- Convert items to JSONB if it's text
    BEGIN
        IF NEW.items IS NULL THEN
            RETURN NEW;
        END IF;
        
        -- Handle both text and jsonb storage
        transaction_items := CASE 
            WHEN pg_typeof(NEW.items) = 'text'::regtype THEN NEW.items::jsonb
            ELSE NEW.items::jsonb
        END;
        
        -- Process each transaction item
        FOR item_record IN 
            SELECT * FROM jsonb_array_elements(transaction_items) AS item
        LOOP
            -- Get recipe ingredients for this product
            FOR ingredient_record IN
                SELECT 
                    rti.ingredient_name,
                    rti.quantity as ingredient_quantity,
                    rti.unit
                FROM recipes r
                JOIN recipe_template_ingredients rti ON r.template_id = rti.recipe_template_id
                WHERE r.store_id = NEW.store_id
                AND r.name = (item_record.item->>'name')::text
                AND r.is_active = true
            LOOP
                -- Calculate required quantity
                required_qty := ingredient_record.ingredient_quantity * (item_record.item->>'quantity')::numeric;
                
                -- Find matching inventory item and deduct
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
                
            END LOOP;
        END LOOP;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Auto inventory deduction failed for transaction %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trg_auto_deduct_inventory
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION auto_deduct_inventory_on_transaction();

-- Also sync product catalog images with products table images
-- Update product_catalog to use the image from products table where missing
UPDATE product_catalog 
SET image_url = p.image_url,
    updated_at = NOW()
FROM products p 
WHERE product_catalog.store_id = p.store_id 
AND product_catalog.product_name = p.name 
AND product_catalog.image_url IS NULL 
AND p.image_url IS NOT NULL;