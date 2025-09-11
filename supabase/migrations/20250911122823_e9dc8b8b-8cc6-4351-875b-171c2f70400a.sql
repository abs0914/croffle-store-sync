-- Fix Mini Croffle recipe quantities and Croffle Overload naming consistency

-- Phase 1: Update Mini Croffle toppings from 1.0 to 0.5 portions
-- Update Choco Flakes, Chocolate Sauce, Colored Sprinkles, and Tiramisu for Mini Croffle recipes
UPDATE recipe_ingredients 
SET quantity = 0.5,
    updated_at = NOW()
WHERE recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    WHERE LOWER(TRIM(r.name)) = 'mini croffle' 
    AND r.is_active = true
)
AND ingredient_name IN ('Choco Flakes', 'Chocolate Sauce', 'Colored Sprinkles', 'Tiramisu')
AND quantity = 1.0;

-- Phase 2: Fix Croffle Overload naming consistency
-- Rename "Croffle Overload Base Recipe" to "Croffle Overload" for consistency
UPDATE recipes 
SET name = 'Croffle Overload',
    updated_at = NOW()
WHERE LOWER(TRIM(name)) = 'croffle overload base recipe'
AND is_active = true;

-- Also update product catalog entries if they exist with the old name
UPDATE product_catalog 
SET product_name = 'Croffle Overload',
    updated_at = NOW()
WHERE LOWER(TRIM(product_name)) = 'croffle overload base recipe'
AND is_available = true;

-- Verification queries to confirm changes
-- Show updated Mini Croffle ingredients
SELECT 
    r.name as recipe_name,
    s.name as store_name,
    ri.ingredient_name,
    ri.quantity,
    ri.unit
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN stores s ON r.store_id = s.id
WHERE LOWER(TRIM(r.name)) = 'mini croffle'
    AND r.is_active = true
    AND ri.ingredient_name IN ('Choco Flakes', 'Chocolate Sauce', 'Colored Sprinkles', 'Tiramisu', 'Marshmallow', 'Peanut')
ORDER BY s.name, ri.ingredient_name;

-- Show Croffle Overload recipes to confirm naming consistency
SELECT 
    r.name as recipe_name,
    s.name as store_name,
    ri.ingredient_name,
    ri.quantity,
    ri.unit
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN stores s ON r.store_id = s.id
WHERE LOWER(TRIM(r.name)) LIKE '%croffle overload%'
    AND r.is_active = true
    AND ri.ingredient_name = 'Peanut'
ORDER BY s.name;