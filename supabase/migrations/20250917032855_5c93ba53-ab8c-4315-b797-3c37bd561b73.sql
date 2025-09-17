-- Update Croffle Overload recipe template ingredient to link Popsicle to inventory
UPDATE recipe_template_ingredients 
SET inventory_stock_id = (
    SELECT id 
    FROM inventory_stock 
    WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
    AND item = 'Popsicle'
    LIMIT 1
)
WHERE recipe_template_id = 'a7554439-dea0-4310-8681-1b35a058361d'
AND ingredient_name = 'Popsicle'
AND inventory_stock_id IS NULL;