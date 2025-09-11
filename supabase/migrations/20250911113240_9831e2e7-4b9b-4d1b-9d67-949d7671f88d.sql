-- CORRECTED: Fix duplicate recipe ingredients causing over-deduction
-- Problem: Each recipe has 8-16 duplicate entries for same ingredient

-- Fixed cleanup function - properly handle UUIDs
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
                (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
                COUNT(*) as duplicate_count,
                (array_agg(inventory_stock_id ORDER BY created_at ASC))[1] as primary_stock_id,
                (array_agg(quantity ORDER BY created_at ASC))[1] as ingredient_quantity,
                (array_agg(unit ORDER BY created_at ASC))[1] as ingredient_unit
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

-- Add missing inventory items for beverages that aren't being tracked
INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, minimum_threshold, is_active, item_category, created_at, updated_at)
SELECT DISTINCT 
    'e78ad702-1135-482d-a508-88104e2706cf' as store_id,
    item_name,
    'pieces' as unit,
    50 as stock_quantity,
    10 as minimum_threshold,
    true as is_active,
    'beverage' as item_category,
    NOW() as created_at,
    NOW() as updated_at
FROM (VALUES 
    ('Coke'),
    ('Sprite'), 
    ('Bottled Water'),
    ('Sugar Sachet')
) AS missing_items(item_name)
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_stock 
    WHERE item = missing_items.item_name 
    AND store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
);

-- Fix missing inventory mappings for existing recipe ingredients
UPDATE recipe_ingredients 
SET inventory_stock_id = (
    SELECT ist.id 
    FROM inventory_stock ist 
    WHERE ist.item = recipe_ingredients.ingredient_name 
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.is_active = true
    LIMIT 1
)
WHERE inventory_stock_id IS NULL
AND EXISTS (
    SELECT 1 FROM inventory_stock ist 
    WHERE ist.item = recipe_ingredients.ingredient_name 
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.is_active = true
);

-- Add missing Strawberry Syrup to Oreo Strawberry Blended recipe if it doesn't exist
INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit, inventory_stock_id, created_at, updated_at)
SELECT DISTINCT
    r.id as recipe_id,
    'Strawberry Syrup' as ingredient_name,
    30 as quantity,
    'ml' as unit,
    ist.id as inventory_stock_id,
    NOW() as created_at,
    NOW() as updated_at
FROM recipes r
JOIN inventory_stock ist ON ist.item = 'Strawberry Syrup' 
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.is_active = true
WHERE r.name = 'Oreo Strawberry Blended'
AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = 'Strawberry Syrup'
);

-- Create enhanced inventory movement logging function
CREATE OR REPLACE FUNCTION log_pos_inventory_deduction(
    p_transaction_id UUID,
    p_product_name TEXT,
    p_ingredient_name TEXT,
    p_quantity_deducted NUMERIC,
    p_inventory_stock_id UUID,
    p_old_quantity NUMERIC,
    p_new_quantity NUMERIC
) RETURNS VOID AS $$
BEGIN
    -- Insert detailed inventory movement record
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
        format('POS Sale: %s - deducted %s units of %s', p_product_name, p_quantity_deducted, p_ingredient_name),
        'pos_system',
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;