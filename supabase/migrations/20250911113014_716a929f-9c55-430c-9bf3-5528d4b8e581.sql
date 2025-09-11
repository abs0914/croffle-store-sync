-- CRITICAL FIX: Clean up duplicate recipe ingredients that are causing massive over-deduction
-- Problem: Each recipe has 8-16 duplicate entries for same ingredient with different inventory_stock_ids

-- First, let's create a function to consolidate duplicate recipe ingredients
CREATE OR REPLACE FUNCTION fix_duplicate_recipe_ingredients()
RETURNS TABLE(
    cleaned_recipes INTEGER,
    total_duplicates_removed INTEGER,
    execution_details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    recipe_record RECORD;
    ingredient_record RECORD;
    kept_count INTEGER := 0;
    removed_count INTEGER := 0;
    recipe_count INTEGER := 0;
BEGIN
    -- Loop through each recipe
    FOR recipe_record IN 
        SELECT DISTINCT recipe_id 
        FROM recipe_ingredients 
        WHERE inventory_stock_id IS NOT NULL
    LOOP
        recipe_count := recipe_count + 1;
        
        -- For each ingredient in this recipe that has duplicates
        FOR ingredient_record IN
            SELECT 
                ingredient_name,
                MIN(id) as keep_id,
                COUNT(*) as duplicate_count,
                MIN(inventory_stock_id) as primary_stock_id,
                MIN(quantity) as ingredient_quantity,
                MIN(unit) as ingredient_unit
            FROM recipe_ingredients 
            WHERE recipe_id = recipe_record.recipe_id 
                AND inventory_stock_id IS NOT NULL
            GROUP BY ingredient_name, recipe_id
            HAVING COUNT(*) > 1
        LOOP
            -- Delete all duplicate entries except the first one
            DELETE FROM recipe_ingredients 
            WHERE recipe_id = recipe_record.recipe_id 
                AND ingredient_name = ingredient_record.ingredient_name 
                AND id != ingredient_record.keep_id;
            
            removed_count := removed_count + (ingredient_record.duplicate_count - 1);
            kept_count := kept_count + 1;
            
            -- Update the kept record to use the primary inventory stock ID
            UPDATE recipe_ingredients 
            SET inventory_stock_id = ingredient_record.primary_stock_id,
                quantity = ingredient_record.ingredient_quantity,
                unit = ingredient_record.ingredient_unit,
                updated_at = NOW()
            WHERE id = ingredient_record.keep_id;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT 
        recipe_count,
        removed_count,
        format('Processed %s recipes, kept %s entries, removed %s duplicates', 
               recipe_count, kept_count, removed_count);
END;
$$;

-- Execute the cleanup
SELECT * FROM fix_duplicate_recipe_ingredients();

-- Add missing inventory items that aren't being tracked
-- Based on user's feedback about Coke, Sprite, Bottled Water not being deducted

INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, minimum_threshold, is_active, item_category)
SELECT DISTINCT 
    'e78ad702-1135-482d-a508-88104e2706cf' as store_id,
    item_name,
    'pieces' as unit,
    50 as stock_quantity,
    10 as minimum_threshold,
    true as is_active,
    'beverage' as item_category
FROM (VALUES 
    ('Coke'),
    ('Sprite'), 
    ('Bottled Water'),
    ('Straw'),
    ('Bending Straw')
) AS missing_items(item_name)
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_stock 
    WHERE item = missing_items.item_name 
    AND store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
);

-- Fix KitKat Croffle mapping - ensure proper inventory mapping
UPDATE recipe_ingredients 
SET inventory_stock_id = (
    SELECT id FROM inventory_stock 
    WHERE item = 'Kitkat' 
    AND store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND is_active = true
    LIMIT 1
)
WHERE ingredient_name = 'Kitkat' 
AND inventory_stock_id IS NULL;

-- Add missing Strawberry Syrup to Oreo Strawberry Blended recipe
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, inventory_stock_id)
SELECT 
    r.id as recipe_id,
    'Strawberry Syrup' as ingredient_name,
    30 as quantity,
    'ml' as unit,
    ist.id as inventory_stock_id
FROM recipes r
JOIN inventory_stock ist ON ist.item = 'Strawberry Syrup' 
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
WHERE r.name = 'Oreo Strawberry Blended'
AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = 'Strawberry Syrup'
);

-- Create enhanced deduction tracking function for better audit
CREATE OR REPLACE FUNCTION log_inventory_deduction_enhanced(
    p_transaction_id UUID,
    p_product_name TEXT,
    p_ingredient_name TEXT,
    p_quantity_deducted NUMERIC,
    p_inventory_stock_id UUID,
    p_old_quantity NUMERIC,
    p_new_quantity NUMERIC
) RETURNS VOID AS $$
BEGIN
    INSERT INTO inventory_movements (
        inventory_stock_id,
        movement_type,
        quantity_change,
        previous_quantity,
        new_quantity,
        reference_type,
        reference_id,
        notes,
        created_by,
        created_at
    ) VALUES (
        p_inventory_stock_id,
        'sale',
        -p_quantity_deducted,
        p_old_quantity,
        p_new_quantity,
        'transaction',
        p_transaction_id,
        format('POS Sale: %s - deducted %s %s', p_product_name, p_quantity_deducted, p_ingredient_name),
        'pos_system',
        NOW()
    );
END;
$$ LANGUAGE plpgsql;