-- Add Choco Flakes as a topping ingredient to the Croffle Overload recipe at Sugbo Mercado IT Park
INSERT INTO recipe_ingredients (
    recipe_id,
    inventory_stock_id,
    quantity,
    unit,
    ingredient_group_name,
    is_optional,
    cost_per_unit,
    display_order
) VALUES (
    'b1d33660-85c5-4c0f-944f-ce7850857424', -- Croffle Overload recipe at Sugbo Mercado IT Park
    'f3888bcc-f650-4f84-bf22-f23c2a904088', -- Choco Flakes inventory stock ID
    1.0,
    'pieces',
    'topping',
    true,
    2.50, -- Similar cost to other toppings
    0
);