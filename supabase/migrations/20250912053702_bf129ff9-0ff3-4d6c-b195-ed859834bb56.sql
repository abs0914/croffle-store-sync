-- Fix cross-store inventory mappings in unified_recipe_ingredients
-- This migration identifies and corrects inventory_stock_id references that point to items in different stores

DO $$
DECLARE
    rec RECORD;
    new_inventory_id UUID;
    changes_count INTEGER := 0;
BEGIN
    -- Create audit log table if it doesn't exist
    CREATE TABLE IF NOT EXISTS inventory_mapping_audit (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        recipe_id UUID,
        old_inventory_stock_id UUID,
        new_inventory_stock_id UUID,
        ingredient_name TEXT,
        old_store_id UUID,
        new_store_id UUID,
        matching_method TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Process each problematic mapping
    FOR rec IN 
        SELECT 
            uri.id,
            uri.recipe_id,
            uri.inventory_stock_id,
            uri.ingredient_name,
            r.store_id as recipe_store_id,
            ist.store_id as inventory_store_id,
            ist.item as inventory_item_name
        FROM unified_recipe_ingredients uri
        JOIN recipes r ON uri.recipe_id = r.id
        LEFT JOIN inventory_stock ist ON uri.inventory_stock_id = ist.id
        WHERE ist.store_id IS NOT NULL 
        AND r.store_id != ist.store_id
        AND uri.inventory_stock_id IS NOT NULL
    LOOP
        -- Find matching inventory item in the correct store
        SELECT id INTO new_inventory_id
        FROM inventory_stock
        WHERE store_id = rec.recipe_store_id
        AND is_active = true
        AND (
            -- Exact match
            LOWER(TRIM(item)) = LOWER(TRIM(rec.ingredient_name))
            OR LOWER(TRIM(item)) = LOWER(TRIM(rec.inventory_item_name))
            OR
            -- Fuzzy match - ingredient contains inventory item
            LOWER(TRIM(rec.ingredient_name)) LIKE '%' || LOWER(TRIM(item)) || '%'
            OR
            -- Fuzzy match - inventory item contains ingredient
            LOWER(TRIM(item)) LIKE '%' || LOWER(TRIM(rec.ingredient_name)) || '%'
            OR
            -- Common variations
            (LOWER(rec.ingredient_name) LIKE '%water%' AND LOWER(item) LIKE '%water%')
            OR (LOWER(rec.ingredient_name) LIKE '%coke%' AND LOWER(item) LIKE '%coke%')
            OR (LOWER(rec.ingredient_name) LIKE '%milk%' AND LOWER(item) LIKE '%milk%')
            OR (LOWER(rec.ingredient_name) LIKE '%sugar%' AND LOWER(item) LIKE '%sugar%')
            OR (LOWER(rec.ingredient_name) LIKE '%flour%' AND LOWER(item) LIKE '%flour%')
            OR (LOWER(rec.ingredient_name) LIKE '%cream%' AND LOWER(item) LIKE '%cream%')
        )
        ORDER BY 
            CASE 
                WHEN LOWER(TRIM(item)) = LOWER(TRIM(rec.ingredient_name)) THEN 1
                WHEN LOWER(TRIM(item)) = LOWER(TRIM(rec.inventory_item_name)) THEN 2
                WHEN LOWER(TRIM(rec.ingredient_name)) LIKE '%' || LOWER(TRIM(item)) || '%' THEN 3
                ELSE 4
            END
        LIMIT 1;

        IF new_inventory_id IS NOT NULL THEN
            -- Log the change for audit trail
            INSERT INTO inventory_mapping_audit (
                recipe_id,
                old_inventory_stock_id,
                new_inventory_stock_id,
                ingredient_name,
                old_store_id,
                new_store_id,
                matching_method
            ) VALUES (
                rec.recipe_id,
                rec.inventory_stock_id,
                new_inventory_id,
                rec.ingredient_name,
                rec.inventory_store_id,
                rec.recipe_store_id,
                CASE 
                    WHEN new_inventory_id IS NOT NULL THEN 'fuzzy_match'
                    ELSE 'no_match'
                END
            );

            -- Update the mapping
            UPDATE unified_recipe_ingredients 
            SET 
                inventory_stock_id = new_inventory_id,
                updated_at = NOW()
            WHERE id = rec.id;
            
            changes_count := changes_count + 1;
            
        ELSE
            -- Log unmappable items for manual review
            INSERT INTO inventory_mapping_audit (
                recipe_id,
                old_inventory_stock_id,
                new_inventory_stock_id,
                ingredient_name,
                old_store_id,
                new_store_id,
                matching_method
            ) VALUES (
                rec.recipe_id,
                rec.inventory_stock_id,
                NULL,
                rec.ingredient_name,
                rec.inventory_store_id,
                rec.recipe_store_id,
                'no_match_found'
            );
        END IF;
    END LOOP;

    RAISE NOTICE 'Fixed % cross-store inventory mappings', changes_count;
END $$;