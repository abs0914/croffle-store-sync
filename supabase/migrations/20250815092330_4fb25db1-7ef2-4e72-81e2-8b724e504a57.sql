-- Add ingredient mappings for all products missing them at Sugbo Mercado (IT Park, Cebu)
-- Store ID for Sugbo Mercado (IT Park, Cebu): f47ac10b-58cc-4372-a567-0e02b2c3d479

-- Get the store ID first
DO $$
DECLARE
    sugbo_store_id UUID;
BEGIN
    SELECT id INTO sugbo_store_id FROM stores WHERE name ILIKE '%sugbo%mercado%it%park%' LIMIT 1;
    
    -- Blueberry
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'f5a843c3-5d87-41af-82ca-51d0709358dc', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%blueberry%' AND ist.item NOT ILIKE '%jam%' LIMIT 1;

    -- Blueberry Jam
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'd76f8874-d424-4568-9c48-c5df4efb6c6c', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%blueberry%' AND ist.item ILIKE '%jam%' LIMIT 1;

    -- Café Mocha (Hot)
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '16f90cc1-d5c7-4e4d-a192-7d5aa89e6e4e', ist.id, 1, 'Serving'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%coffee%' LIMIT 1;

    -- Café Mocha (Iced)
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'ece93ed5-ca09-4ea2-a956-c73e57e2bac7', ist.id, 1, 'Serving'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%coffee%' LIMIT 1;

    -- Caramel
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'ecdedbf6-f881-4323-8bfc-63c8b2c8a351', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%caramel%' LIMIT 1;

    -- Caramel Latte (Hot)
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '24efd1da-9d82-4445-9a61-c5b748d1c753', ist.id, 1, 'Serving'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%coffee%' LIMIT 1;

    -- Caramel Latte (Iced)
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'e9f5127c-4d87-45cb-943e-6fe252fc8ce3', ist.id, 1, 'Serving'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%coffee%' LIMIT 1;

    -- Choco Flakes
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '14fa6e8b-6eb9-4b11-879a-96e87e46a13a', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%choco%flakes%' LIMIT 1;

    -- Chocolate
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '75625dc9-59ab-4c91-b2ce-3e65bda597e2', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%chocolate%' AND ist.item NOT ILIKE '%dark%' LIMIT 1;

    -- Choco Marshmallow
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '6f3fa483-a9ab-43cc-94b1-2ed54c4a2938', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%chocolate%' LIMIT 1;

    -- Choco Overload
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '0cf80f7e-4f40-4ea7-83d7-d803d3474428', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%chocolate%' LIMIT 1;

    -- Coke
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'c22760a7-92e0-4878-bc99-827ede9f05eb', ist.id, 1, 'Pieces'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%coke%' LIMIT 1;

    -- Colored Sprinkles
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '33e5bb03-1634-43aa-af02-7660533c0767', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%sprinkles%' LIMIT 1;

    -- Dark Chocolate (first entry)
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'b81c49a0-33ef-4880-a736-b97181b7487c', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%dark%chocolate%' LIMIT 1;

    -- Dark Chocolate (second entry)
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'b739b37b-75f8-4b4d-93c1-c80cdd825961', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%dark%chocolate%' LIMIT 1;

    -- Graham Crushed
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'a8ce0fa4-bf15-4dfd-b1d7-b1b108d2ddf0', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%graham%' LIMIT 1;

    -- Iced Tea
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '4f58b57f-0bf9-4604-ae84-f469a12a9e25', ist.id, 1, 'Serving'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%tea%' LIMIT 1;

    -- KitKat
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'a09a9df0-0034-49f9-91e8-55872ba89ffb', ist.id, 1, 'Pieces'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%kitkat%' LIMIT 1;

    -- Lemonade
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'de81aa27-7d35-4558-9d0d-f4b0c7a1ed7d', ist.id, 1, 'Serving'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%lemon%' LIMIT 1;

    -- Mango
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '2fcd5d8b-92f5-4322-91e2-04132c3fc162', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%mango%' AND ist.item NOT ILIKE '%jam%' LIMIT 1;

    -- Mango Jam
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'b5a52026-7966-4f42-b763-aeaf323aeee2', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%mango%' AND ist.item ILIKE '%jam%' LIMIT 1;

    -- Marshmallow
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '4b1c51e9-9c3a-4a31-87c8-5c575d5a2cf7', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%marshmallow%' LIMIT 1;

    -- Matcha
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'c8e804e2-70b3-42d9-9ac6-d562cd76052e', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%matcha%' LIMIT 1;

    -- Matcha Blended
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '358dd8fc-4b00-4933-aace-6ea71c0a94a4', ist.id, 1, 'Serving'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%matcha%' LIMIT 1;

    -- Nutella
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '347874b5-0bd4-4caf-8753-02f85d9f39f5', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%nutella%' LIMIT 1;

    -- Nutella Special
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '414ac931-37cb-427a-bf56-89e660c831a5', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%nutella%' LIMIT 1;

    -- Oreo Crushed
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '218abe48-41f1-4136-bc13-e0cc8fa6f4c0', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%oreo%' AND ist.item ILIKE '%crushed%' LIMIT 1;

    -- Oreo Strawberry
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'b552e763-30f4-47b3-8277-798de675f92e', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%oreo%' LIMIT 1;

    -- Peanut
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '9ba61e89-21d4-4a06-be37-7f4700cdbaa2', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%peanut%' LIMIT 1;

    -- Sprite
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '06bc5a70-5ba4-48b7-a970-85d112173826', ist.id, 1, 'Pieces'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%sprite%' LIMIT 1;

    -- Strawberry
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'd989ef32-21d3-4002-9df5-14fa9f265162', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%strawberry%' AND ist.item NOT ILIKE '%jam%' LIMIT 1;

    -- Strawberry Jam
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '387c90a7-e007-4877-84fd-92b3155dae03', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%strawberry%' AND ist.item ILIKE '%jam%' LIMIT 1;

    -- Strawberry Kiss
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'e1b2a2bc-a134-481c-9f77-223db0d0a724', ist.id, 1, 'Portion'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%strawberry%' LIMIT 1;

    -- Strawberry Latte (Iced)
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '848de75c-7639-405c-9ec5-bc6925b637c6', ist.id, 1, 'Serving'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%coffee%' LIMIT 1;

    -- Take-out box w/ cover
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT '7911e34a-9adc-4458-be8f-55793ca27e4f', ist.id, 1, 'Pieces'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%box%' LIMIT 1;

    -- Tiramisu
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'fd55bd94-6d41-4778-ada2-243a2b138429', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%tiramisu%' LIMIT 1;

    -- Vanilla Caramel
    INSERT INTO product_ingredients (product_catalog_id, inventory_stock_id, required_quantity, unit)
    SELECT 'db0caa8d-34ed-4e51-89fa-e83bd668eafc', ist.id, 1, 'Scoop'
    FROM inventory_stock ist
    WHERE ist.store_id = sugbo_store_id 
    AND ist.item ILIKE '%vanilla%' OR ist.item ILIKE '%caramel%' LIMIT 1;

END $$;