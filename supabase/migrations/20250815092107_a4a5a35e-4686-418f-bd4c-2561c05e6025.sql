-- Add more ingredient mappings for remaining products at Gaisano Capital SRP

-- Mango Jam
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('57b7d028-f036-4a08-a300-5e721854e2fa', 'e648f29e-2053-4995-9162-b39ded4d8c85', 1, 'Scoop');

-- Marshmallow
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT '6df752e8-20c8-4e25-bc50-123887bec92e', ist.id, 1, 'Portion'
FROM inventory_stock ist
WHERE ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf' 
AND ist.item ILIKE '%marshmallow%' LIMIT 1;

-- Nutella
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT '46b900c8-8090-4afb-83fd-3552f37532d9', ist.id, 1, 'Scoop'
FROM inventory_stock ist
WHERE ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf' 
AND ist.item ILIKE '%nutella%' LIMIT 1;

-- Oreo Cookies
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT '1deebf54-d0a3-459a-84b2-70278ee51846', ist.id, 1, 'Portion'
FROM inventory_stock ist
WHERE ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf' 
AND ist.item ILIKE '%oreo%' AND ist.item NOT ILIKE '%crushed%' LIMIT 1;

-- Oreo Crushed
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT '3cc131a1-f0fc-47f0-92fd-f76fbe9c8558', ist.id, 1, 'Portion'
FROM inventory_stock ist
WHERE ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf' 
AND ist.item ILIKE '%oreo%' AND ist.item ILIKE '%crushed%' LIMIT 1;

-- Sprite
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT 'b40f782d-5293-4a36-936b-781e0bd68f7d', ist.id, 1, 'Pieces'
FROM inventory_stock ist
WHERE ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf' 
AND ist.item ILIKE '%sprite%' LIMIT 1;

-- Strawberry Jam
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT '826dd2c0-c684-4fe3-ae0d-9fc6618e9e3e', ist.id, 1, 'Scoop'
FROM inventory_stock ist
WHERE ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf' 
AND ist.item ILIKE '%strawberry%' AND ist.item ILIKE '%jam%' LIMIT 1;