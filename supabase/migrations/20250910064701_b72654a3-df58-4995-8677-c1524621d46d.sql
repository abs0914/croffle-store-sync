-- Fix the trigger function to use user_id instead of created_by
-- and add created_by column to transaction_items table

-- First, add the missing created_by column to transaction_items
ALTER TABLE transaction_items 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Update the trigger function to use user_id from transactions table
CREATE OR REPLACE FUNCTION public.deduct_recipe_ingredients_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recipe_ingredient RECORD;
    inventory_item RECORD;
    actual_deduction NUMERIC;
    transaction_user_id UUID;
BEGIN
    -- Get the user_id from the transaction (corrected from created_by to user_id)
    SELECT user_id INTO transaction_user_id
    FROM transactions 
    WHERE id = NEW.transaction_id;
    
    -- Only process items that have a recipe (product_type = 'recipe')
    IF NEW.product_type = 'recipe' THEN
        -- Find all recipe ingredients for this product through recipe mapping
        FOR recipe_ingredient IN
            SELECT 
                ri.ingredient_name,
                ri.quantity as recipe_quantity,
                ri.unit as recipe_unit,
                rim.conversion_factor,
                rim.inventory_stock_id
            FROM recipe_ingredients ri
            JOIN recipe_ingredient_mappings rim ON (
                rim.recipe_id = ri.recipe_id 
                AND rim.ingredient_name = ri.ingredient_name
            )
            JOIN recipes r ON r.id = ri.recipe_id
            JOIN product_catalog pc ON pc.recipe_id = r.id
            WHERE pc.id = NEW.product_id
              AND r.is_active = true
              AND rim.inventory_stock_id IS NOT NULL
        LOOP
            -- Calculate total ingredient needed (recipe quantity * sold quantity * conversion factor)
            actual_deduction := recipe_ingredient.recipe_quantity * NEW.quantity * COALESCE(recipe_ingredient.conversion_factor, 1);
            
            -- Get current inventory info
            SELECT * INTO inventory_item
            FROM inventory_stock 
            WHERE id = recipe_ingredient.inventory_stock_id;
            
            IF FOUND THEN
                -- Update inventory stock
                UPDATE inventory_stock 
                SET 
                    stock_quantity = GREATEST(0, stock_quantity - actual_deduction),
                    updated_at = NOW()
                WHERE id = recipe_ingredient.inventory_stock_id;
                
                -- Log the inventory movement with proper UUID handling
                PERFORM public.insert_inventory_movement_safe(
                    recipe_ingredient.inventory_stock_id,
                    'outbound',
                    -actual_deduction,
                    inventory_item.stock_quantity,
                    GREATEST(0, inventory_item.stock_quantity - actual_deduction),
                    'sale',
                    NEW.transaction_id::text,  -- Pass as text, function will handle UUID conversion
                    format('Sale deduction for %s (Recipe: %s, Qty: %s)', 
                           NEW.name, recipe_ingredient.ingredient_name, actual_deduction),
                    COALESCE(transaction_user_id::text, auth.uid()::text)  -- Pass as text, function will handle UUID conversion
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;