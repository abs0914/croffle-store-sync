-- Update Mini Take Out Box inventory costs to ₱5.00 each
UPDATE inventory_stock 
SET cost = 5.00, 
    updated_at = NOW() 
WHERE item = 'Mini Take Out Box' AND cost = 0;

-- Recalculate recipe costs for Mini Take Out Box recipes
UPDATE recipes 
SET total_cost = (
    SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, COALESCE(ist.cost, 0))), 0)
    FROM recipe_ingredients ri
    LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
    WHERE ri.recipe_id = recipes.id
),
cost_per_serving = (
    SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, COALESCE(ist.cost, 0))), 0) / GREATEST(yield_quantity, 1)
    FROM recipe_ingredients ri
    LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
    WHERE ri.recipe_id = recipes.id
),
suggested_price = (
    SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, COALESCE(ist.cost, 0))), 0) * 1.5
    FROM recipe_ingredients ri
    LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
    WHERE ri.recipe_id = recipes.id
),
updated_at = NOW()
WHERE name = 'Mini Take Out Box' AND total_cost = 0;