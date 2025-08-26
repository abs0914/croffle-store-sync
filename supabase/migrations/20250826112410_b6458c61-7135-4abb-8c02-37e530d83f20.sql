-- Update all recipe templates that were recently imported with zero price
-- to have the correct suggested prices from the original CSV data

UPDATE recipe_templates 
SET suggested_price = CASE 
    WHEN name = 'Bottled Water' THEN 20
    WHEN name = 'Coke' THEN 20
    WHEN name = 'Sprite' THEN 20
    WHEN name = 'Matcha Blended' THEN 90
    WHEN name = 'Oreo Strawberry Blended' THEN 110
    WHEN name = 'Strawberry Kiss Blended' THEN 110
    WHEN name = 'Caramel Delight  Croffle' THEN 125
    WHEN name = 'Choco Marshmallow Croffle' THEN 125
    WHEN name = 'Choco Nut Croffle' THEN 125
    WHEN name = 'Tiramisu Croffle' THEN 125
    WHEN name = 'Iced Tea' THEN 60
    WHEN name = 'Lemonade' THEN 60
    WHEN name = 'Vanilla Caramel Iced' THEN 90
    WHEN name = 'Americano Hot' THEN 65
    WHEN name = 'Americano Iced' THEN 70
    WHEN name = 'Cafe Latte Hot' THEN 65
    WHEN name = 'Cafe Latte Iced' THEN 70
    WHEN name = 'Cafe Mocha Hot' THEN 65
    WHEN name = 'Cafe Mocha Iced' THEN 70
    WHEN name = 'Cappuccino Hot' THEN 65
    WHEN name = 'Cappuccino Iced' THEN 70
    WHEN name = 'Blueberry Croffle' THEN 125
    WHEN name = 'Mango Croffle' THEN 125
    WHEN name = 'Strawberry Croffle' THEN 125
    WHEN name = 'Glaze Croffle' THEN 79
    WHEN name = 'Croffle Overload' THEN 99
    WHEN name = 'Mini Croffle' THEN 65
    WHEN name = 'Biscoff Croffle' THEN 125
    WHEN name = 'Choco Overload Croffle' THEN 125
    WHEN name = 'Cookies  Cream Croffle' THEN 125
    WHEN name = 'Dark Chocolate Croffle' THEN 125
    WHEN name = 'KitKat Croffle' THEN 125
    WHEN name = 'Matcha  Croffle' THEN 125
    WHEN name = 'Nutella Croffle' THEN 125
    WHEN name = 'Biscoff Crushed' THEN 10
    WHEN name = 'Blueberry Jam' THEN 10
    WHEN name = 'Caramel Sauce' THEN 6
    WHEN name = 'Choco Flakes' THEN 6
    WHEN name = 'Chocolate Sauce' THEN 6
    WHEN name = 'Colored Sprinkles' THEN 6
    WHEN name = 'Mango Jam' THEN 10
    WHEN name = 'Marshmallow' THEN 6
    WHEN name = 'Mini Take Out Box' THEN 10
    WHEN name = 'Nutella Sauce' THEN 10
    WHEN name = 'Oreo Cookies' THEN 10
    WHEN name = 'Oreo Crushed' THEN 10
    WHEN name = 'Peanut' THEN 6
    WHEN name = 'Strawberry Jam' THEN 10
    WHEN name = 'Tiramisu' THEN 6
    WHEN name = 'Dark Chocolate Sauce' THEN 8
    -- Keep zero prices for packaging items
    ELSE 0
END,
updated_at = NOW()
WHERE suggested_price = 0 
AND created_at > NOW() - INTERVAL '2 hours';