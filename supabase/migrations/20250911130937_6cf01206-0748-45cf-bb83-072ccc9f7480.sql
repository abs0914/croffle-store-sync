-- Update KitKat Croffle recipe: Change KitKat quantity from 0.5 to 1.0
UPDATE recipe_ingredients 
SET quantity = 1.0,
    updated_at = NOW()
WHERE recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    WHERE LOWER(TRIM(r.name)) = 'kitkat croffle' 
    AND r.is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'kitkat'
AND quantity = 0.5;

-- Verification: Show updated KitKat Croffle recipes
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
WHERE LOWER(TRIM(r.name)) = 'kitkat croffle'
    AND r.is_active = true
    AND LOWER(TRIM(ri.ingredient_name)) = 'kitkat'
ORDER BY s.name;