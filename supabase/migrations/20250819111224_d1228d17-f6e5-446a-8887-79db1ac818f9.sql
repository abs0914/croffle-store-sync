-- Fix Blueberry Croffle ingredients: Remove Vanilla Ice Cream and add correct ingredients

-- First, delete the incorrect Vanilla Ice Cream ingredient for Blueberry Croffle
DELETE FROM product_ingredients 
WHERE id = '5992954a-1ee6-4276-bbf5-7ea96d181b38';

-- Add WHIPPED CREAM ingredient for Blueberry Croffle
INSERT INTO product_ingredients (
  product_catalog_id,
  inventory_stock_id, 
  required_quantity,
  unit
)
SELECT 
  pc.id as product_catalog_id,
  ist.id as inventory_stock_id,
  1 as required_quantity,
  'Serving' as unit
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Blueberry Croffle' 
  AND pc.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86'
  AND ist.item = 'WHIPPED CREAM'
  AND ist.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';

-- Add Blueberry Jam ingredient for Blueberry Croffle  
INSERT INTO product_ingredients (
  product_catalog_id,
  inventory_stock_id,
  required_quantity, 
  unit
)
SELECT 
  pc.id as product_catalog_id,
  ist.id as inventory_stock_id,
  1 as required_quantity,
  'Scoop' as unit
FROM product_catalog pc
CROSS JOIN inventory_stock ist
WHERE pc.product_name = 'Blueberry Croffle'
  AND pc.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86' 
  AND ist.item = 'Blueberry Jam'
  AND ist.store_id = 'fd45e07e-7832-4f51-b46b-7ef604359b86';