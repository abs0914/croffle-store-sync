-- Insert coffee inventory items to all active stores
INSERT INTO inventory_stock (store_id, item, unit, stock_quantity, minimum_threshold, is_active, created_at, updated_at)
SELECT 
    s.id as store_id,
    coffee_items.item_name,
    coffee_items.unit,
    coffee_items.quantity,
    CASE 
        WHEN coffee_items.unit = 'serving' THEN 5
        WHEN coffee_items.unit = 'grams' THEN 100
        WHEN coffee_items.unit = 'pieces' THEN 20
        ELSE 10
    END as minimum_threshold,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM stores s
CROSS JOIN (
    VALUES 
        ('Milk', 'serving', 17),
        ('Coffee', 'grams', 1040),
        ('Monalisa', 'grams', 1073),
        ('Caramel Sauce', 'grams', 1),
        ('Frappe Powder', 'grams', 438),
        ('Chocolate Sauce', 'grams', 168),
        ('Strawberry Syrup', 'grams', 1162),
        ('Vanilla Syrup', 'grams', 639),
        ('Sugar Syrup', 'grams', 480),
        ('Matcha Powder', 'grams', 431),
        ('Ice Tea Powder', 'grams', 217),
        ('Lemonade Powder (Cucumber)', 'grams', 157),
        ('16Oz Hot Cups', 'pieces', 51),
        ('16Oz Plastic Cup', 'pieces', 141),
        ('Flat Lid', 'pieces', 104),
        ('Coffee Lid', 'pieces', 56),
        ('Straw', 'pieces', 133),
        ('Stirrer', 'pieces', 47),
        ('Sugar Sachet', 'pieces', 9),
        ('Creamer', 'pieces', 29)
) AS coffee_items(item_name, unit, quantity)
WHERE s.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM inventory_stock ist 
    WHERE ist.store_id = s.id 
    AND ist.item = coffee_items.item_name 
    AND ist.unit = coffee_items.unit
);

-- Log the insertion count
SELECT 
    COUNT(*) as total_items_added,
    COUNT(DISTINCT store_id) as stores_updated
FROM inventory_stock 
WHERE item IN (
    'Milk', 'Coffee', 'Monalisa', 'Caramel Sauce', 'Frappe Powder',
    'Chocolate Sauce', 'Strawberry Syrup', 'Vanilla Syrup', 'Sugar Syrup',
    'Matcha Powder', 'Ice Tea Powder', 'Lemonade Powder (Cucumber)',
    '16Oz Hot Cups', '16Oz Plastic Cup', 'Flat Lid', 'Coffee Lid',
    'Straw', 'Stirrer', 'Sugar Sachet', 'Creamer'
)
AND created_at >= NOW() - INTERVAL '1 minute';