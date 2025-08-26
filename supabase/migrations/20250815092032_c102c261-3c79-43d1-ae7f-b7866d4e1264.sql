-- Add ingredient mappings for products missing ingredients at Gaisano Capital SRP
-- Based on exact or close name matches between product_catalog and inventory_stock

-- Blueberry Jam
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('12b01aaa-7220-4f9d-80c9-2d96a5c92df5', '23b6a5b6-9f58-4f45-84cf-c5039d7c68cd', 1, 'Scoop');

-- Bottled Water at Gaisano Capital SRP
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
SELECT 'd8b3702d-4a67-4daa-a989-f267925e087f', ist.id, 1, 'pieces'
FROM inventory_stock ist
WHERE ist.store_id = 'e78ad702-1135-482d-a508-88104e2706cf' 
AND ist.item = 'Bottled Water' AND ist.unit = 'pieces';

-- Caramel (using Caramel inventory)
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('df838155-01c6-4453-8be8-50e11711056a', 'c54fe5f4-a493-451c-8453-631201597376', 1, 'Portion');

-- Choco Flakes
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('db1c6043-5682-441c-bf4b-65f01b69d73c', 'bc282d1b-affa-49f5-bf03-b6cbc0d8f0ea', 1, 'Portion');

-- Chocolate (using Chocolate inventory)
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('5996d3e3-f5d8-4618-888e-c27f99ac4cb4', 'a7f8f09a-889f-4a3e-a950-8461aad2b640', 1, 'Portion');

-- Coke
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('3543fa71-e168-40e6-adc9-d70571ffbcff', '8baaf92c-a784-4a67-9d46-c74ff47113f3', 1, 'Pieces');

-- Colored Sprinkles
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('99fedfbf-ee30-4316-8533-4683173a48b5', '362156ad-2141-48ea-9bf4-9661bda3293d', 1, 'Portion');

-- Dark Chocolate
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('9d3ef292-7787-49c5-b48e-81f96c045720', 'f3e3ee74-6cfc-473f-94d3-365d414b48e2', 1, 'Portion');

-- Graham Crushed
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('20e0e307-2f29-4597-9135-c230ce1083ba', 'c7ae67ec-5f70-4c7a-b12f-c3ccc6aab8e6', 1, 'Portion');

-- KitKat
INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
VALUES ('da1f2595-2b83-4fe5-806c-b759a5554b8f', 'dd19d8fb-8914-40a0-8cc0-7b3b27730f79', 1, 'Portion');