-- Add missing Popsicle ingredient to all existing Croffle Overload recipes
INSERT INTO recipe_ingredients (
    recipe_id,
    ingredient_name,
    quantity,
    unit,
    cost_per_unit,
    inventory_stock_id,
    created_at,
    updated_at
)
SELECT DISTINCT
    r.id as recipe_id,
    'Popsicle' as ingredient_name,
    1 as quantity,
    'pieces'::inventory_unit as unit,
    0 as cost_per_unit,
    ist.id as inventory_stock_id,
    NOW() as created_at,
    NOW() as updated_at
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN inventory_stock ist ON (ist.store_id = r.store_id AND ist.item = 'Popsicle')
WHERE rt.name = 'Croffle Overload'
    AND r.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM recipe_ingredients ri 
        WHERE ri.recipe_id = r.id 
        AND ri.ingredient_name = 'Popsicle'
    );