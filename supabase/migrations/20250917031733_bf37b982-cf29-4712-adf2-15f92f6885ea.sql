-- Create the missing Chocolate Sauce portion -> portion mapping
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
    1.0,  -- 1 portion = 1 portion (direct mapping)
    'Auto-created mapping for Mini Croffle chocolate sauce deduction - direct portion match'
FROM inventory_stock ist
WHERE ist.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'  -- Sugbo Mercado
AND ist.item = 'Chocolate Sauce'
AND ist.unit = 'portion'
AND NOT EXISTS (
    SELECT 1 FROM conversion_mappings cm
    WHERE cm.recipe_ingredient_name = 'Chocolate Sauce'
    AND cm.recipe_ingredient_unit = 'portion'
    AND cm.inventory_stock_id = ist.id
);