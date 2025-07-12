-- Re-categorize products to match intended category structure for Sugbo Mercado

-- Update Premium category products
UPDATE product_catalog SET category_id = (
    SELECT c.id FROM categories c 
    WHERE c.store_id = product_catalog.store_id 
    AND c.name = 'Premium'
    LIMIT 1
)
WHERE product_name IN ('Biscoff Croffle', 'Choco Overload Croffle', 'Cookies & Cream Croffle', 'Dark Chocolate Croffle', 'KitKat Croffle', 'Matcha Croffle', 'Nutella Croffle')
AND store_id = (SELECT id FROM stores WHERE name = 'Sugbo Mercado' AND location = 'IT Park, Cebu' LIMIT 1);

-- Update Fruity category products  
UPDATE product_catalog SET category_id = (
    SELECT c.id FROM categories c 
    WHERE c.store_id = product_catalog.store_id 
    AND c.name = 'Fruity'
    LIMIT 1
)
WHERE product_name IN ('Blueberry Croffle', 'Mango Croffle', 'Strawberry Croffle')
AND store_id = (SELECT id FROM stores WHERE name = 'Sugbo Mercado' AND location = 'IT Park, Cebu' LIMIT 1);