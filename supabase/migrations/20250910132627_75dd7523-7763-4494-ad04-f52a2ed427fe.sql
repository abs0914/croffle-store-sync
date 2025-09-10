-- Clean up remaining unmapped Coffee Beans ingredients for Americano Iced
UPDATE recipe_ingredients ri
SET inventory_stock_id = ist.id,
    updated_at = NOW()
FROM inventory_stock ist,
     recipes r
WHERE ri.recipe_id = r.id
  AND r.name = 'Americano Iced'
  AND ri.ingredient_name = 'Coffee Beans'
  AND ri.inventory_stock_id IS NULL
  AND ist.item = 'Coffee Beans'
  AND ist.store_id = r.store_id
  AND ist.is_active = true;