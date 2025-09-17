-- Update all Popsicle ingredients to have the correct ingredient_group_name as 'packaging'
UPDATE recipe_ingredients
SET ingredient_group_name = 'packaging'
FROM inventory_stock ist
WHERE recipe_ingredients.inventory_stock_id = ist.id
AND LOWER(ist.item) = 'popsicle';