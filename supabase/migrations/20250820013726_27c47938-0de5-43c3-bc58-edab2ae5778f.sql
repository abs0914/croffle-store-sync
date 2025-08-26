-- Comprehensive Croffle Recipe Correction
-- This migration fixes all croffle recipes with the correct ingredient lists

-- First, let's create a temporary function to help with ingredient matching
CREATE OR REPLACE FUNCTION find_inventory_item(store_id_param UUID, item_name_param TEXT)
RETURNS UUID AS $$
DECLARE
    inventory_id UUID;
BEGIN
    -- Try exact match first
    SELECT id INTO inventory_id
    FROM inventory_stock 
    WHERE store_id = store_id_param 
    AND LOWER(TRIM(item)) = LOWER(TRIM(item_name_param))
    AND is_active = true
    LIMIT 1;
    
    -- If no exact match, try partial match
    IF inventory_id IS NULL THEN
        SELECT id INTO inventory_id
        FROM inventory_stock 
        WHERE store_id = store_id_param 
        AND LOWER(TRIM(item)) LIKE '%' || LOWER(TRIM(item_name_param)) || '%'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    RETURN inventory_id;
END;
$$ LANGUAGE plpgsql;

-- Define the correct croffle recipes with their ingredients
DO $$
DECLARE
    store_record RECORD;
    recipe_record RECORD;
    ingredient_id UUID;
    base_cost NUMERIC := 0;
    total_recipe_cost NUMERIC;
    
    -- Croffle recipes with their correct ingredients
    croffle_recipes TEXT[][] := ARRAY[
        ARRAY['Choco Marshmallow Croffle', 'Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Marshmallow Toppings'],
        ARRAY['Tiramisu Croffle', 'Regular Croissant', 'Whipped Cream', 'Tiramisu Sauce', 'Choco Flakes'],
        ARRAY['Choco Nut Croffle', 'Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Peanut Toppings'],
        ARRAY['Caramel Delight Croffle', 'Regular Croissant', 'Whipped Cream', 'Caramel Sauce', 'Colored Sprinkle Toppings'],
        ARRAY['Biscoff Croffle', 'Regular Croissant', 'Whipped Cream', 'Biscoff Crushed', 'Biscoff Biscuit'],
        ARRAY['Nutella Croffle', 'Regular Croissant', 'Whipped Cream', 'Nutella Sauce'],
        ARRAY['Kitkat Croffle', 'Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', '1pc Kitkat Topping'],
        ARRAY['Cookies & Cream Croffle', 'Regular Croissant', 'Whipped Cream', 'Crushed Oreo', '1pc Oreo Cookie (cut to half) Topping'],
        ARRAY['Choco Overload Croffle', 'Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Chocolate Flakes Toppings'],
        ARRAY['Matcha Croffle', 'Regular Croissant', 'Whipped Cream', 'Matcha Crumbs'],
        ARRAY['Dark Chocolate Croffle', 'Regular Croissant', 'Whipped Cream', 'Dark Chocolate Sauce', 'Chocolate Crumbs'],
        ARRAY['Strawberry Croffle', 'Regular Croissant', 'Whipped Cream', 'Strawberry Toppings'],
        ARRAY['Mango Croffle', 'Regular Croissant', 'Whipped Cream', 'Mango Toppings', 'Crushed Grahams'],
        ARRAY['Blueberry Croffle', 'Regular Croissant', 'Whipped Cream', 'Blueberry Toppings', 'Crushed Grahams']
    ];
    
    recipe_name TEXT;
    ingredient_name TEXT;
    ingredient_qty NUMERIC;
    ingredient_unit TEXT;
    i INTEGER;
    j INTEGER;
BEGIN
    -- Loop through all active stores
    FOR store_record IN 
        SELECT id, name FROM stores WHERE is_active = true
    LOOP
        RAISE NOTICE 'Processing store: %', store_record.name;
        
        -- Loop through each croffle recipe
        FOR i IN 1..array_length(croffle_recipes, 1) LOOP
            recipe_name := croffle_recipes[i][1];
            
            -- Find the recipe for this store
            SELECT r.* INTO recipe_record
            FROM recipes r
            WHERE r.store_id = store_record.id
            AND LOWER(TRIM(r.name)) = LOWER(TRIM(recipe_name));
            
            IF recipe_record.id IS NOT NULL THEN
                RAISE NOTICE 'Updating recipe: % for store %', recipe_name, store_record.name;
                
                -- Delete existing recipe ingredients
                DELETE FROM recipe_ingredients 
                WHERE recipe_id = recipe_record.id;
                
                total_recipe_cost := 0;
                
                -- Add ingredients for this recipe (starting from index 2, skipping recipe name)
                FOR j IN 2..array_length(croffle_recipes[i], 1) LOOP
                    ingredient_name := croffle_recipes[i][j];
                    
                    -- Set default quantities and units based on ingredient type
                    IF ingredient_name = 'Regular Croissant' THEN
                        ingredient_qty := 1;
                        ingredient_unit := 'piece';
                    ELSIF ingredient_name LIKE '%Sauce%' OR ingredient_name LIKE '%Syrup%' THEN
                        ingredient_qty := 30;
                        ingredient_unit := 'ml';
                    ELSIF ingredient_name = 'Whipped Cream' THEN
                        ingredient_qty := 50;
                        ingredient_unit := 'ml';
                    ELSIF ingredient_name LIKE '%Toppings%' OR ingredient_name LIKE '%Flakes%' OR ingredient_name LIKE '%Crumbs%' THEN
                        ingredient_qty := 10;
                        ingredient_unit := 'grams';
                    ELSIF ingredient_name LIKE '%1pc%' THEN
                        ingredient_qty := 1;
                        ingredient_unit := 'piece';
                    ELSIF ingredient_name LIKE '%Crushed%' THEN
                        ingredient_qty := 5;
                        ingredient_unit := 'grams';
                    ELSIF ingredient_name LIKE '%Biscuit%' THEN
                        ingredient_qty := 1;
                        ingredient_unit := 'piece';
                    ELSE
                        ingredient_qty := 1;
                        ingredient_unit := 'piece';
                    END IF;
                    
                    -- Find the inventory item
                    ingredient_id := find_inventory_item(store_record.id, ingredient_name);
                    
                    -- If ingredient found, add it to the recipe
                    IF ingredient_id IS NOT NULL THEN
                        -- Get the cost for this ingredient
                        SELECT COALESCE(cost, 0) INTO base_cost
                        FROM inventory_stock
                        WHERE id = ingredient_id;
                        
                        -- Insert the recipe ingredient
                        INSERT INTO recipe_ingredients (
                            recipe_id,
                            inventory_stock_id,
                            ingredient_name,
                            quantity,
                            unit,
                            cost_per_unit
                        ) VALUES (
                            recipe_record.id,
                            ingredient_id,
                            ingredient_name,
                            ingredient_qty,
                            ingredient_unit,
                            base_cost
                        );
                        
                        total_recipe_cost := total_recipe_cost + (ingredient_qty * base_cost);
                        
                        RAISE NOTICE 'Added ingredient: % (qty: %, cost: %)', ingredient_name, ingredient_qty, base_cost;
                    ELSE
                        RAISE NOTICE 'Ingredient not found in inventory: %', ingredient_name;
                    END IF;
                END LOOP;
                
                -- Update recipe cost
                UPDATE recipes 
                SET total_cost = total_recipe_cost,
                    cost_per_serving = total_recipe_cost / GREATEST(serving_size, 1),
                    updated_at = NOW()
                WHERE id = recipe_record.id;
                
                RAISE NOTICE 'Updated recipe cost for %: %', recipe_name, total_recipe_cost;
            ELSE
                RAISE NOTICE 'Recipe not found: % for store %', recipe_name, store_record.name;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Clean up the temporary function
DROP FUNCTION find_inventory_item(UUID, TEXT);

-- Update product catalog prices based on updated recipe costs
UPDATE product_catalog 
SET price = CASE 
    WHEN r.total_cost > 0 THEN ROUND(r.total_cost * 2.5, 2) -- 150% markup
    ELSE price 
END,
updated_at = NOW()
FROM recipes r
WHERE r.id = product_catalog.recipe_id
AND r.name ILIKE '%croffle%'
AND r.total_cost > 0;

-- Ensure all croffle products are available
UPDATE product_catalog 
SET is_available = true,
    updated_at = NOW()
WHERE product_name ILIKE '%croffle%'
AND is_available = false;

-- Add packaging ingredients if missing
DO $$
DECLARE
    store_record RECORD;
    recipe_record RECORD;
    wax_paper_id UUID;
    chopstick_id UUID;
BEGIN
    FOR store_record IN 
        SELECT id FROM stores WHERE is_active = true
    LOOP
        -- Find packaging items
        SELECT id INTO wax_paper_id
        FROM inventory_stock
        WHERE store_id = store_record.id
        AND LOWER(item) LIKE '%wax paper%'
        AND is_active = true
        LIMIT 1;
        
        SELECT id INTO chopstick_id
        FROM inventory_stock
        WHERE store_id = store_record.id
        AND LOWER(item) LIKE '%chopstick%'
        AND is_active = true
        LIMIT 1;
        
        -- Add packaging to all croffle recipes
        FOR recipe_record IN
            SELECT id FROM recipes 
            WHERE store_id = store_record.id
            AND name ILIKE '%croffle%'
        LOOP
            -- Add wax paper if found and not already present
            IF wax_paper_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM recipe_ingredients 
                WHERE recipe_id = recipe_record.id 
                AND inventory_stock_id = wax_paper_id
            ) THEN
                INSERT INTO recipe_ingredients (
                    recipe_id, inventory_stock_id, ingredient_name, 
                    quantity, unit, cost_per_unit
                )
                SELECT recipe_record.id, wax_paper_id, 'Wax Paper', 
                       1, 'piece', COALESCE(cost, 0)
                FROM inventory_stock WHERE id = wax_paper_id;
            END IF;
            
            -- Add chopstick if found and not already present  
            IF chopstick_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM recipe_ingredients 
                WHERE recipe_id = recipe_record.id 
                AND inventory_stock_id = chopstick_id
            ) THEN
                INSERT INTO recipe_ingredients (
                    recipe_id, inventory_stock_id, ingredient_name,
                    quantity, unit, cost_per_unit
                )
                SELECT recipe_record.id, chopstick_id, 'Chopstick',
                       1, 'piece', COALESCE(cost, 0)
                FROM inventory_stock WHERE id = chopstick_id;
            END IF;
        END LOOP;
    END LOOP;
END $$;