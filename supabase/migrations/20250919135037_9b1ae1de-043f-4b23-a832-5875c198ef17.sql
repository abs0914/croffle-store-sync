-- Remove "Popsicle" entries and update mappings to use existing "Popsicle Stick"

-- First, update conversion mappings to reference Popsicle Stick
UPDATE conversion_mappings 
SET recipe_ingredient_name = 'Popsicle Stick',
    updated_at = NOW()
WHERE LOWER(TRIM(recipe_ingredient_name)) = 'popsicle';

-- Update recipe template ingredients that reference "Popsicle" to "Popsicle Stick"
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Popsicle Stick'
WHERE LOWER(TRIM(ingredient_name)) = 'popsicle';

-- Update any conversion mappings that point to Popsicle inventory items to point to Popsicle Stick items
UPDATE conversion_mappings 
SET inventory_stock_id = (
    SELECT ps.id 
    FROM inventory_stock ps 
    WHERE ps.store_id = (
        SELECT p.store_id 
        FROM inventory_stock p 
        WHERE p.id = conversion_mappings.inventory_stock_id
    )
    AND LOWER(TRIM(ps.item)) = 'popsicle stick'
    LIMIT 1
),
updated_at = NOW()
WHERE inventory_stock_id IN (
    SELECT id FROM inventory_stock WHERE LOWER(TRIM(item)) = 'popsicle'
);

-- Update recipe ingredients that reference Popsicle inventory items to reference Popsicle Stick items  
UPDATE recipe_ingredients
SET inventory_stock_id = (
    SELECT ps.id 
    FROM inventory_stock ps 
    WHERE ps.store_id = (
        SELECT p.store_id 
        FROM inventory_stock p 
        WHERE p.id = recipe_ingredients.inventory_stock_id
    )
    AND LOWER(TRIM(ps.item)) = 'popsicle stick'
    LIMIT 1
),
updated_at = NOW()
WHERE inventory_stock_id IN (
    SELECT id FROM inventory_stock WHERE LOWER(TRIM(item)) = 'popsicle'
);

-- Finally, delete the Popsicle inventory items
DELETE FROM inventory_stock 
WHERE LOWER(TRIM(item)) = 'popsicle';