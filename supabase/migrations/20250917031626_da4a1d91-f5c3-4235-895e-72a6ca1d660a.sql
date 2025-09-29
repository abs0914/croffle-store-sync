-- Create missing conversion mappings for Sugbo Mercado

-- First, create conversion mapping for Chocolate Sauce (portion) -> Chocolate Sauce (g)
INSERT INTO conversion_mappings (
    recipe_ingredient_name,
    recipe_ingredient_unit,
    inventory_stock_id,
    conversion_factor,
    notes
)
SELECT 
    'Chocolate Sauce',
    'portion',
    ist.id,
    5.0,  -- 1 portion = 5 grams of chocolate sauce
    'Auto-created mapping for Mini Croffle chocolate sauce deduction'
FROM inventory_stock ist
WHERE ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'  -- Sugbo Mercado
AND ist.item = 'Chocolate Sauce'
AND ist.unit = 'g'
AND NOT EXISTS (
    SELECT 1 FROM conversion_mappings cm
    WHERE cm.recipe_ingredient_name = 'Chocolate Sauce'
    AND cm.recipe_ingredient_unit = 'portion'
    AND cm.inventory_stock_id = ist.id
);

-- Create Popsicle inventory item for Sugbo Mercado if it doesn't exist
INSERT INTO inventory_stock (
    store_id,
    item,
    unit,
    stock_quantity,
    minimum_threshold,
    cost,
    is_active,
    item_category
)
SELECT 
    'd7c47e6b-f20a-4543-a6bd-000398f72df5',  -- Sugbo Mercado
    'Popsicle',
    'pieces',
    100,  -- Initial stock
    10,   -- Minimum threshold
    0.30, -- Cost per piece
    true,
    'premium_topping'
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_stock 
    WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
    AND item = 'Popsicle'
);

-- Create conversion mapping for Popsicle (pieces) -> Popsicle (pieces)
INSERT INTO conversion_mappings (
    recipe_ingredient_name,
    recipe_ingredient_unit,
    inventory_stock_id,
    conversion_factor,
    notes
)
SELECT 
    'Popsicle',
    'pieces',
    ist.id,
    1.0,  -- 1 piece = 1 piece
    'Auto-created mapping for Croffle Overload popsicle deduction'
FROM inventory_stock ist
WHERE ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'  -- Sugbo Mercado
AND ist.item = 'Popsicle'
AND ist.unit = 'pieces'
AND NOT EXISTS (
    SELECT 1 FROM conversion_mappings cm
    WHERE cm.recipe_ingredient_name = 'Popsicle'
    AND cm.recipe_ingredient_unit = 'pieces'
    AND cm.inventory_stock_id = ist.id
);