-- Fix ALL ingredient mapping issues based on reference screenshot

-- First, remove ALL incorrect Vanilla Ice Cream mappings from croffles (except Croffle Overload which should have ice cream)
DELETE FROM product_ingredients 
WHERE product_catalog_id IN (
    SELECT pc.id 
    FROM product_catalog pc
    JOIN inventory_stock ist ON product_ingredients.inventory_stock_id = ist.id
    WHERE pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
        AND pc.product_name ILIKE '%croffle%'
        AND pc.product_name NOT ILIKE '%overload%'
        AND ist.item = 'Vanilla Ice Cream'
);

-- Remove incorrect mappings from beverages that have 60+ ingredients
DELETE FROM product_ingredients 
WHERE product_catalog_id IN (
    SELECT pc.id 
    FROM product_catalog pc
    WHERE pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
        AND pc.product_name IN ('Americano (Hot)', 'Cafe Latte (Hot)', 'Cafe Latte (Iced)')
);

-- Add correct WHIPPED CREAM base to all croffles (except those that already have it)
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT DISTINCT
    pc.id,
    ist.id,
    1,
    'Serving'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND pc.product_name ILIKE '%croffle%'
    AND ist.item = 'WHIPPED CREAM'
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id 
        AND ist2.item = 'WHIPPED CREAM'
    );

-- CLASSIC CROFFLES: Add specific ingredients per reference

-- Tiramisu Croffle: + Tiramisu Sauce + Choco Flakes
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 'Portion'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Tiramisu Croffle' 
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Tiramisu', 'Choco Flakes')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Choco Nut Croffle: + Chocolate Sauce + Peanut Toppings
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 
    CASE WHEN ist.item = 'Chocolate Sauce' THEN 1 ELSE 1 END,
    CASE WHEN ist.item = 'Chocolate Sauce' THEN 'ml' ELSE 'Portion' END
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Choco Nut Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Chocolate Sauce', 'Peanut')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Caramel Delight Croffle: + Caramel Sauce + Colored Sprinkles
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id,
    CASE WHEN ist.item = 'Caramel Sauce' THEN 1 ELSE 1 END,
    CASE WHEN ist.item = 'Caramel Sauce' THEN 'ml' ELSE 'Portion' END
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Caramel Delight  Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Caramel Sauce', 'Colored Sprinkles')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Choco Marshmallow Croffle: + Chocolate Sauce + Marshmallow
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id,
    CASE WHEN ist.item = 'Chocolate Sauce' THEN 1 ELSE 1 END,
    CASE WHEN ist.item = 'Chocolate Sauce' THEN 'ml' ELSE 'Portion' END
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Choco Marshmallow Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Chocolate Sauce', 'Marshmallow')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- FRUITY CROFFLES: Add specific ingredients per reference

-- Strawberry Croffle: + Strawberry Jam 
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 'Scoop'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Strawberry Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item = 'Strawberry Jam'
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Mango Croffle: + Mango Jam + Crushed Graham
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 
    CASE WHEN ist.item = 'Mango Jam' THEN 'Scoop' ELSE 'Portion' END
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Mango Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Mango Jam', 'Graham Crushed')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- PREMIUM CROFFLES: Add missing ingredients per reference

-- Nutella Croffle: + Nutella Sauce
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 'Portion'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Nutella Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item = 'Nutella'
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- KitKat Croffle: + Chocolate Sauce + KitKat
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1,
    CASE WHEN ist.item = 'Chocolate Sauce' THEN 'ml' ELSE 'Portion' END
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'KitKat Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Chocolate Sauce', 'Kitkat')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Cookies & Cream: + Crushed Oreo + Oreo Cookie
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 
    CASE WHEN ist.item = 'Oreo Cookie' THEN 0.5 ELSE 1 END,
    'portions'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Cookies & Cream'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Crushed Oreo', 'Oreo Cookie')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Choco Overload: + Chocolate Sauce + Chocolate Flakes (keep ice cream for this one)
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1,
    CASE WHEN ist.item = 'Chocolate Sauce' THEN 'ml' ELSE 'Portion' END
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Choco Overload Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Chocolate Sauce', 'Chocolate Flakes')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Matcha Croffle: + Matcha Crumbs
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 'Portion'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Matcha  Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item = 'Matcha crumble'
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Dark Chocolate Croffle: + Dark Chocolate + Chocolate Crumbs
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 'Portion'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Dark Chocolate Croffle'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Dark Chocolate', 'Chocolate crumble')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        JOIN inventory_stock ist2 ON pi2.inventory_stock_id = ist2.id
        WHERE pi2.product_catalog_id = pc.id AND ist2.item = ist.item
    );

-- Fix Biscoff Croffle: Remove Vanilla Ice Cream, add WHIPPED CREAM if not present
DELETE FROM product_ingredients 
WHERE product_catalog_id IN (
    SELECT pc.id 
    FROM product_catalog pc
    JOIN inventory_stock ist ON product_ingredients.inventory_stock_id = ist.id
    WHERE pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
        AND pc.product_name = 'Biscoff Croffle'
        AND ist.item = 'Vanilla Ice Cream'
);

-- Add basic ingredients for beverages
-- Americano (Hot): Coffee + Hot Cup + Lid
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 'piece'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Americano (Hot)'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Coffee', 'Hot Cup', 'Lid')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        WHERE pi2.product_catalog_id = pc.id
    );

-- Cafe Latte (Hot): Coffee + Milk + Hot Cup + Lid  
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 'piece'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Cafe Latte (Hot)'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Coffee', 'Milk', 'Hot Cup', 'Lid')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        WHERE pi2.product_catalog_id = pc.id
    );

-- Cafe Latte (Iced): Coffee + Milk + Cold Cup + Lid
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT pc.id, ist.id, 1, 'piece'
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Cafe Latte (Iced)'
    AND pc.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND ist.item IN ('Coffee', 'Milk', 'Cold Cup', 'Lid')
    AND ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
    AND NOT EXISTS (
        SELECT 1 FROM product_ingredients pi2
        WHERE pi2.product_catalog_id = pc.id
    );