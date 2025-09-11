-- Update recipes for Americano Iced and Caramel Latte variants

-- Phase 1: Update Americano Iced Coffee Beans from 18g to 12g
UPDATE recipe_ingredients 
SET quantity = 12.0,
    updated_at = NOW()
WHERE recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    WHERE LOWER(TRIM(r.name)) = 'americano iced' 
    AND r.is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'coffee beans'
AND quantity = 18.0;

-- Phase 2: Update Caramel Latte Iced Vanilla Syrup from 5ml to 10ml
UPDATE recipe_ingredients 
SET quantity = 10.0,
    updated_at = NOW()
WHERE recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    WHERE LOWER(TRIM(r.name)) = 'caramel latte iced' 
    AND r.is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'vanilla syrup'
AND quantity = 5.0;

-- Phase 3: Add Vanilla Syrup (10ml) to Caramel Latte Hot recipes that don't have it
INSERT INTO recipe_ingredients (
    recipe_id,
    ingredient_name,
    quantity,
    unit,
    cost_per_unit,
    created_at,
    updated_at
)
SELECT 
    r.id,
    'Vanilla Syrup',
    10.0,
    'ml'::inventory_unit,
    2.5, -- Default cost per unit for vanilla syrup
    NOW(),
    NOW()
FROM recipes r
WHERE LOWER(TRIM(r.name)) = 'caramel latte hot'
    AND r.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredients ri
        WHERE ri.recipe_id = r.id
        AND LOWER(TRIM(ri.ingredient_name)) = 'vanilla syrup'
    );

-- Update existing Vanilla Syrup in Caramel Latte Hot to 10ml if it exists with different quantity
UPDATE recipe_ingredients 
SET quantity = 10.0,
    updated_at = NOW()
WHERE recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    WHERE LOWER(TRIM(r.name)) = 'caramel latte hot' 
    AND r.is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'vanilla syrup'
AND quantity != 10.0;

-- Verification: Show updated Americano Iced recipes
SELECT 
    s.name as store_name,
    r.name as recipe_name,
    ri.ingredient_name,
    ri.quantity,
    ri.unit
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN stores s ON r.store_id = s.id
WHERE LOWER(TRIM(r.name)) = 'americano iced'
    AND r.is_active = true
    AND LOWER(TRIM(ri.ingredient_name)) = 'coffee beans'
ORDER BY s.name;

-- Verification: Show updated Caramel Latte variants with Vanilla Syrup
SELECT 
    s.name as store_name,
    r.name as recipe_name,
    ri.ingredient_name,
    ri.quantity,
    ri.unit
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN stores s ON r.store_id = s.id
WHERE LOWER(TRIM(r.name)) IN ('caramel latte hot', 'caramel latte iced')
    AND r.is_active = true
    AND LOWER(TRIM(ri.ingredient_name)) = 'vanilla syrup'
ORDER BY s.name, r.name;