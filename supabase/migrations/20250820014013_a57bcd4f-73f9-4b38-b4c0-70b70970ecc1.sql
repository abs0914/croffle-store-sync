-- Croffle Recipe Correction with Proper Unit Casting
-- This migration fixes all croffle recipes with correct ingredient lists and proper unit types

-- Create helper function for finding inventory items
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

-- Create helper function to add recipe ingredients with proper unit casting
CREATE OR REPLACE FUNCTION add_croffle_ingredients(recipe_id_param UUID, store_id_param UUID, ingredients TEXT[])
RETURNS NUMERIC AS $$
DECLARE
    ingredient_name TEXT;
    ingredient_id UUID;
    ingredient_qty NUMERIC;
    ingredient_unit inventory_unit;
    base_cost NUMERIC := 0;
    total_cost NUMERIC := 0;
    i INTEGER;
BEGIN
    -- Delete existing ingredients first
    DELETE FROM recipe_ingredients WHERE recipe_id = recipe_id_param;
    
    -- Loop through each ingredient
    FOR i IN 1..array_length(ingredients, 1) LOOP
        ingredient_name := ingredients[i];
        
        -- Set quantities and units based on ingredient type
        CASE 
            WHEN ingredient_name = 'Regular Croissant' THEN
                ingredient_qty := 1; ingredient_unit := 'pieces'::inventory_unit;
            WHEN ingredient_name LIKE '%Sauce%' OR ingredient_name LIKE '%Syrup%' THEN
                ingredient_qty := 30; ingredient_unit := 'ml'::inventory_unit;
            WHEN ingredient_name = 'Whipped Cream' THEN
                ingredient_qty := 50; ingredient_unit := 'ml'::inventory_unit;
            WHEN ingredient_name LIKE '%Toppings%' OR ingredient_name LIKE '%Flakes%' OR ingredient_name LIKE '%Crumbs%' THEN
                ingredient_qty := 10; ingredient_unit := 'grams'::inventory_unit;
            WHEN ingredient_name LIKE '%1pc%' THEN
                ingredient_qty := 1; ingredient_unit := 'pieces'::inventory_unit;
            WHEN ingredient_name LIKE '%Crushed%' THEN
                ingredient_qty := 5; ingredient_unit := 'grams'::inventory_unit;
            WHEN ingredient_name LIKE '%Biscuit%' THEN
                ingredient_qty := 1; ingredient_unit := 'pieces'::inventory_unit;
            ELSE
                ingredient_qty := 1; ingredient_unit := 'pieces'::inventory_unit;
        END CASE;
        
        -- Find inventory item
        ingredient_id := find_inventory_item(store_id_param, ingredient_name);
        
        IF ingredient_id IS NOT NULL THEN
            -- Get cost
            SELECT COALESCE(cost, 0) INTO base_cost
            FROM inventory_stock WHERE id = ingredient_id;
            
            -- Insert ingredient
            INSERT INTO recipe_ingredients (
                recipe_id, inventory_stock_id, ingredient_name, 
                quantity, unit, cost_per_unit
            ) VALUES (
                recipe_id_param, ingredient_id, ingredient_name,
                ingredient_qty, ingredient_unit, base_cost
            );
            
            total_cost := total_cost + (ingredient_qty * base_cost);
        END IF;
    END LOOP;
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Fix croffle recipes with correct ingredients
DO $$
DECLARE
    store_record RECORD;
    recipe_record RECORD;
    total_recipe_cost NUMERIC;
BEGIN
    FOR store_record IN SELECT id, name FROM stores WHERE is_active = true LOOP
        
        -- Process each croffle recipe
        FOR recipe_record IN 
            SELECT * FROM recipes 
            WHERE store_id = store_record.id 
            AND LOWER(name) ILIKE '%croffle%'
        LOOP
            -- Determine ingredients based on recipe name
            CASE LOWER(TRIM(recipe_record.name))
                WHEN 'choco marshmallow croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id, 
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Marshmallow Toppings']);
                        
                WHEN 'tiramisu croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Tiramisu Sauce', 'Choco Flakes']);
                        
                WHEN 'choco nut croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Peanut Toppings']);
                        
                WHEN 'caramel delight croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Caramel Sauce', 'Colored Sprinkle Toppings']);
                        
                WHEN 'biscoff croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Biscoff Crushed', 'Biscoff Biscuit']);
                        
                WHEN 'nutella croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Nutella Sauce']);
                        
                WHEN 'kitkat croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', '1pc Kitkat Topping']);
                        
                WHEN 'cookies & cream croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Crushed Oreo', '1pc Oreo Cookie (cut to half) Topping']);
                        
                WHEN 'choco overload croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Chocolate Flakes Toppings']);
                        
                WHEN 'matcha croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Matcha Crumbs']);
                        
                WHEN 'dark chocolate croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Dark Chocolate Sauce', 'Chocolate Crumbs']);
                        
                WHEN 'strawberry croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Strawberry Toppings']);
                        
                WHEN 'mango croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Mango Toppings', 'Crushed Grahams']);
                        
                WHEN 'blueberry croffle' THEN
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream', 'Blueberry Toppings', 'Crushed Grahams']);
                        
                ELSE
                    -- For any other croffle, use basic ingredients
                    total_recipe_cost := add_croffle_ingredients(recipe_record.id, store_record.id,
                        ARRAY['Regular Croissant', 'Whipped Cream']);
            END CASE;
            
            -- Update recipe cost
            UPDATE recipes 
            SET total_cost = total_recipe_cost,
                cost_per_serving = total_recipe_cost / GREATEST(serving_size, 1),
                updated_at = NOW()
            WHERE id = recipe_record.id;
            
        END LOOP;
    END LOOP;
END $$;

-- Update product catalog prices with 150% markup
UPDATE product_catalog 
SET price = CASE 
    WHEN r.total_cost > 0 THEN ROUND(r.total_cost * 2.5, 2)
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
WHERE product_name ILIKE '%croffle%';

-- Clean up helper functions
DROP FUNCTION add_croffle_ingredients(UUID, UUID, TEXT[]);
DROP FUNCTION find_inventory_item(UUID, TEXT);