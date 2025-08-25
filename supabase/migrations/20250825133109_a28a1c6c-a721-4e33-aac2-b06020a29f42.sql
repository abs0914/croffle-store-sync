-- Remove the incorrect trigger and function
DROP TRIGGER IF EXISTS trigger_deduct_recipe_ingredients ON inventory_transactions;
DROP FUNCTION IF EXISTS deduct_recipe_ingredients();

-- Create a function to automatically deduct recipe ingredients when a product is sold
CREATE OR REPLACE FUNCTION deduct_recipe_ingredients_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    recipe_record RECORD;
    ingredient_record RECORD;
    deduction_quantity NUMERIC;
    transaction_record RECORD;
BEGIN
    -- Get the transaction details to verify it's completed
    SELECT status, store_id INTO transaction_record
    FROM transactions 
    WHERE id = NEW.transaction_id;
    
    -- Only process completed transactions
    IF transaction_record.status != 'completed' THEN
        RETURN NEW;
    END IF;

    -- Find if this product has a recipe
    SELECT r.id, r.name, pc.product_name
    INTO recipe_record
    FROM product_catalog pc
    JOIN recipes r ON pc.recipe_id = r.id
    WHERE pc.id = NEW.product_id 
    AND pc.store_id = transaction_record.store_id;

    -- If no recipe found, return without processing
    IF recipe_record.id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Process each ingredient in the recipe
    FOR ingredient_record IN
        SELECT 
            ri.inventory_stock_id,
            ri.quantity as needed_quantity,
            ri.unit,
            ri.ingredient_name,
            inv.stock_quantity as current_stock,
            inv.item as item_name
        FROM recipe_ingredients ri
        JOIN inventory_stock inv ON ri.inventory_stock_id = inv.id
        WHERE ri.recipe_id = recipe_record.id
        AND inv.is_active = true
    LOOP
        -- Calculate total quantity needed (recipe quantity * number of items sold)
        deduction_quantity := ingredient_record.needed_quantity * NEW.quantity;
        
        -- Check if enough stock is available
        IF ingredient_record.current_stock < deduction_quantity THEN
            RAISE EXCEPTION 'Insufficient stock for ingredient %. Required: %, Available: %', 
                ingredient_record.ingredient_name, deduction_quantity, ingredient_record.current_stock;
        END IF;
        
        -- Deduct the ingredient from inventory
        UPDATE inventory_stock 
        SET stock_quantity = stock_quantity - deduction_quantity,
            updated_at = NOW()
        WHERE id = ingredient_record.inventory_stock_id;
        
        -- Create inventory movement record for the ingredient deduction
        INSERT INTO inventory_movements (
            inventory_stock_id,
            movement_type,
            quantity_change,
            previous_quantity,
            new_quantity,
            notes,
            reference_id,
            created_by
        ) VALUES (
            ingredient_record.inventory_stock_id,
            'recipe_deduction',
            -deduction_quantity,
            ingredient_record.current_stock,
            ingredient_record.current_stock - deduction_quantity,
            'Auto-deduction for recipe: ' || recipe_record.product_name || ' (Qty: ' || NEW.quantity || ')',
            NEW.transaction_id::text,
            (SELECT user_id FROM transactions WHERE id = NEW.transaction_id)
        );
        
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically deduct ingredients when transaction items are inserted
DROP TRIGGER IF EXISTS trigger_deduct_recipe_ingredients_on_sale ON transaction_items;
CREATE TRIGGER trigger_deduct_recipe_ingredients_on_sale
    AFTER INSERT ON transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION deduct_recipe_ingredients_on_sale();