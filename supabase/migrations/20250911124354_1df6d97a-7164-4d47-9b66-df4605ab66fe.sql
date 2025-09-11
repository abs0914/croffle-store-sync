-- Update Oreo Strawberry Blended recipe to include 3 portions of Crushed Oreo across all stores

-- Phase 1: Update existing Crushed Oreo quantities to 3.0 pieces
UPDATE recipe_ingredients 
SET quantity = 3.0,
    updated_at = NOW()
WHERE recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    WHERE LOWER(TRIM(r.name)) = 'oreo strawberry blended' 
    AND r.is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'crushed oreo'
AND quantity != 3.0;

-- Phase 2: Add missing Crushed Oreo ingredient (3.0 pieces) to stores that don't have it
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
    'Crushed Oreo',
    3.0,
    'pieces'::inventory_unit,
    5.0, -- Default cost per unit
    NOW(),
    NOW()
FROM recipes r
WHERE LOWER(TRIM(r.name)) = 'oreo strawberry blended'
    AND r.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredients ri
        WHERE ri.recipe_id = r.id
        AND LOWER(TRIM(ri.ingredient_name)) = 'crushed oreo'
    );

-- Verification: Show all Oreo Strawberry Blended recipes with Crushed Oreo quantities
SELECT 
    s.name as store_name,
    r.name as recipe_name,
    ri.ingredient_name,
    ri.quantity,
    ri.unit,
    ri.cost_per_unit
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN stores s ON r.store_id = s.id
WHERE LOWER(TRIM(r.name)) = 'oreo strawberry blended'
    AND r.is_active = true
    AND LOWER(TRIM(ri.ingredient_name)) = 'crushed oreo'
ORDER BY s.name;

-- Verification: Show complete Oreo Strawberry Blended recipe for all stores
SELECT 
    s.name as store_name,
    r.name as recipe_name,
    ri.ingredient_name,
    ri.quantity,
    ri.unit,
    ri.cost_per_unit,
    (ri.quantity * ri.cost_per_unit) as ingredient_total_cost
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN stores s ON r.store_id = s.id
WHERE LOWER(TRIM(r.name)) = 'oreo strawberry blended'
    AND r.is_active = true
ORDER BY s.name, ri.ingredient_name;