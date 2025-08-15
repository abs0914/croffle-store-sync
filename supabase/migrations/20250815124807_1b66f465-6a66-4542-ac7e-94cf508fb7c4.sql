-- Fix the Mango recipe by adding the missing ingredient
-- The Mango product has a recipe but no ingredients, causing validation failures

-- Let's add Mango Jam as an ingredient for the Mango recipe
-- We'll use 1 piece (serving) of Mango Jam per croffle

INSERT INTO recipe_ingredients (
  recipe_id,
  inventory_stock_id,
  quantity,
  unit,
  created_at
)
SELECT 
  '7e6354ca-c732-4874-962a-e3acce6f8101', -- Mango recipe ID
  id, -- inventory_stock_id for Mango Jam
  1.0, -- 1 piece (serving) of Mango Jam per croffle
  'pieces',
  now()
FROM inventory_stock 
WHERE item = 'Mango Jam' 
  AND stock_quantity > 0
LIMIT 1;