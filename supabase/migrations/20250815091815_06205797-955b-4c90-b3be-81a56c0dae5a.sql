-- Add ingredient mapping for Bottled Water at Sugbo IT Park using correct product_catalog_id
INSERT INTO product_ingredients (
    product_catalog_id,
    inventory_stock_id,
    required_quantity,
    unit
) VALUES (
    '979f6dcc-0c09-455f-8507-ddc992360846', -- product_catalog ID for Bottled Water at Sugbo IT Park
    '34f981cd-3ad0-42a1-ad23-308cf64443e9', -- Bottled Water inventory item ID 
    1, -- 1 bottle per product unit
    'pieces' -- unit matches inventory_stock unit
);