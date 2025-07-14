-- Move jam products from Fruity category to Add-ons category
UPDATE product_catalog 
SET category_id = (
    SELECT c_addons.id 
    FROM categories c_addons 
    WHERE c_addons.name = 'Add-ons' 
    AND c_addons.store_id = product_catalog.store_id
)
WHERE product_name IN ('Mango Jam', 'Blueberry Jam', 'Strawberry Jam')
AND category_id IN (
    SELECT c_fruity.id 
    FROM categories c_fruity 
    WHERE c_fruity.name = 'Fruity'
);

-- Move Biscoff from Premium category to Add-ons category  
UPDATE product_catalog 
SET category_id = (
    SELECT c_addons.id 
    FROM categories c_addons 
    WHERE c_addons.name = 'Add-ons' 
    AND c_addons.store_id = product_catalog.store_id
)
WHERE product_name = 'Biscoff'
AND category_id IN (
    SELECT c_premium.id 
    FROM categories c_premium 
    WHERE c_premium.name = 'Premium'
);