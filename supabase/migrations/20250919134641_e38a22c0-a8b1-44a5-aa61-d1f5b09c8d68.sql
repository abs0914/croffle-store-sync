-- Remove "Popsicle" from inventory and replace with "Popsicle Stick"

-- Update any existing inventory stock items named "Popsicle" to "Popsicle Stick"
UPDATE inventory_stock 
SET item = 'Popsicle Stick',
    updated_at = NOW()
WHERE LOWER(TRIM(item)) = 'popsicle';

-- Update any conversion mappings that reference "Popsicle" to "Popsicle Stick"  
UPDATE conversion_mappings 
SET recipe_ingredient_name = 'Popsicle Stick',
    updated_at = NOW()
WHERE LOWER(TRIM(recipe_ingredient_name)) = 'popsicle';

-- Update any recipe ingredients that reference "Popsicle" to "Popsicle Stick"
UPDATE recipe_ingredients 
SET ingredient_name = 'Popsicle Stick',
    updated_at = NOW()  
WHERE LOWER(TRIM(ingredient_name)) = 'popsicle';

-- Update any recipe template ingredients that reference "Popsicle" to "Popsicle Stick"
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Popsicle Stick'
WHERE LOWER(TRIM(ingredient_name)) = 'popsicle';