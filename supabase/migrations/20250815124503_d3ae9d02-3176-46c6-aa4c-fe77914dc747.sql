-- Fix the Mango recipe by adding the missing ingredient
-- The Mango product has a recipe but no ingredients, causing validation failures

-- Let's add Mango Jam as an ingredient for the Mango recipe
-- We'll use a standard portion size of 1 scoop per serving

INSERT INTO recipe_ingredients (
  recipe_id,
  inventory_stock_id,
  required_quantity,
  unit,
  created_at,
  updated_at
)
SELECT 
  '7e6354ca-c732-4874-962a-e3acce6f8101', -- Mango recipe ID
  id, -- inventory_stock_id for Mango Jam
  1.0, -- 1 scoop of Mango Jam per serving
  'Scoop',
  now(),
  now()
FROM inventory_stock 
WHERE item = 'Mango Jam' 
  AND stock_quantity > 0
  AND id NOT IN (
    SELECT inventory_stock_id 
    FROM recipe_ingredients 
    WHERE recipe_id = '7e6354ca-c732-4874-962a-e3acce6f8101'
  )
LIMIT 1;

-- Verify the ingredient was added
-- This should now return at least one row
-- SELECT ri.*, is_item.item as ingredient_name
-- FROM recipe_ingredients ri
-- JOIN inventory_stock is_item ON ri.inventory_stock_id = is_item.id
-- WHERE ri.recipe_id = '7e6354ca-c732-4874-962a-e3acce6f8101';