-- Add ingredient mapping for Bottled Water at Sugbo IT Park
INSERT INTO product_ingredients (
    product_catalog_id,
    inventory_stock_id,
    required_quantity
) VALUES (
    '08338500-c0cb-4024-a232-ce34c5573393', -- Bottled Water product ID at Sugbo IT Park
    '34f981cd-3ad0-42a1-ad23-308cf64443e9', -- Bottled Water inventory item ID 
    1 -- 1 bottle per product unit
);