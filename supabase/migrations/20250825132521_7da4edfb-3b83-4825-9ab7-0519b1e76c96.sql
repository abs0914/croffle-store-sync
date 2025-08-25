-- Create a function to automatically deduct recipe ingredients when a product is sold
CREATE OR REPLACE FUNCTION deduct_recipe_ingredients()
RETURNS TRIGGER AS $$
DECLARE
    recipe_record RECORD;
    ingredient_record RECORD;
    current_stock NUMERIC;
BEGIN
    -- Only process sales transactions
    IF NEW.transaction_type != 'sale' THEN
        RETURN NEW;
    END IF;

    -- Find if this product has a recipe
    SELECT r.id, r.name 
    INTO recipe_record
    FROM product_catalog pc
    JOIN recipes r ON pc.recipe_id = r.id
    WHERE pc.id = NEW.product_id 
    AND pc.store_id = NEW.store_id;

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
        current_stock := ingredient_record.needed_quantity * NEW.quantity;
        
        -- Check if enough stock is available
        IF ingredient_record.current_stock < current_stock THEN
            RAISE EXCEPTION 'Insufficient stock for ingredient %. Required: %, Available: %', 
                ingredient_record.ingredient_name, current_stock, ingredient_record.current_stock;
        END IF;
        
        -- Deduct the ingredient from inventory
        UPDATE inventory_stock 
        SET stock_quantity = stock_quantity - current_stock,
            updated_at = NOW()
        WHERE id = ingredient_record.inventory_stock_id;
        
        -- Create inventory transaction record for the ingredient deduction
        INSERT INTO inventory_transactions (
            store_id,
            product_id,
            transaction_type,
            quantity,
            previous_stock,
            new_stock,
            notes,
            reference_id,
            created_at
        ) VALUES (
            NEW.store_id,
            ingredient_record.inventory_stock_id,
            'recipe_deduction',
            current_stock,
            ingredient_record.current_stock,
            ingredient_record.current_stock - current_stock,
            'Auto-deduction for recipe: ' || recipe_record.name || ' (Product sale)',
            NEW.id::text,
            NOW()
        );
        
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically deduct ingredients when inventory transactions are created
DROP TRIGGER IF EXISTS trigger_deduct_recipe_ingredients ON inventory_transactions;
CREATE TRIGGER trigger_deduct_recipe_ingredients
    AFTER INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION deduct_recipe_ingredients();

-- Add recipe_deduction as a valid transaction type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%inventory_transactions_transaction_type%'
        AND constraint_definition LIKE '%recipe_deduction%'
    ) THEN
        -- Add the new transaction type to the enum or constraint
        ALTER TABLE inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;
        ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_transaction_type_check 
        CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'waste', 'recipe_deduction'));
    END IF;
END $$;