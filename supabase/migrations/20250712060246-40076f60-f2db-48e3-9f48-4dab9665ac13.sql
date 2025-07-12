-- Step 1: Update recipe template categories to match the required structure

-- Premium croffles
UPDATE recipe_templates SET category_name = 'premium' 
WHERE name IN ('Biscoff Croffle', 'Choco Overload Croffle', 'Cookies & Cream  Croffle', 'Dark Chocolate Croffle', 'KitKat Croffle', 'Matcha  Croffle', 'Nutella Croffle');

-- Fruity croffles  
UPDATE recipe_templates SET category_name = 'fruity'
WHERE name IN ('Blueberry Croffle', 'Mango Croffle', 'Strawberry Croffle');

-- Classic croffles (keep as classic)
UPDATE recipe_templates SET category_name = 'classic'
WHERE name IN ('Caramel Delight  Croffle', 'Choco Marshmallow Croffle', 'Choco Nut Croffle', 'Tiramisu Croffle');

-- Beverages - normalize case
UPDATE recipe_templates SET category_name = 'beverages' 
WHERE category_name = 'Beverages';

-- Add missing categories to all stores
INSERT INTO categories (store_id, name, is_active, description)
SELECT s.id, 'Premium', true, 'Premium croffle offerings'
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.store_id = s.id AND c.name = 'Premium'
);

INSERT INTO categories (store_id, name, is_active, description)
SELECT s.id, 'Fruity', true, 'Fruit-flavored croffles'
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.store_id = s.id AND c.name = 'Fruity'
);

-- Create separate categories for mini croffle and croffle overload
INSERT INTO categories (store_id, name, is_active, description)
SELECT s.id, 'Mini Croffle', true, 'Mini-sized croffles'
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.store_id = s.id AND c.name = 'Mini Croffle'
);

INSERT INTO categories (store_id, name, is_active, description)
SELECT s.id, 'Croffle Overload', true, 'Overloaded croffles'
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
    SELECT 1 FROM categories c 
    WHERE c.store_id = s.id AND c.name = 'Croffle Overload'
);

-- Update product catalog entries to use correct categories
UPDATE product_catalog SET category_id = (
    SELECT c.id FROM categories c 
    WHERE c.store_id = product_catalog.store_id 
    AND c.name = 'Premium'
    LIMIT 1
)
WHERE product_name IN ('Biscoff Croffle', 'Choco Overload Croffle', 'Cookies & Cream Croffle', 'Dark Chocolate Croffle', 'KitKat Croffle', 'Matcha Croffle', 'Nutella Croffle');

UPDATE product_catalog SET category_id = (
    SELECT c.id FROM categories c 
    WHERE c.store_id = product_catalog.store_id 
    AND c.name = 'Fruity'
    LIMIT 1
)
WHERE product_name IN ('Blueberry Croffle', 'Mango Croffle', 'Strawberry Croffle');

UPDATE product_catalog SET category_id = (
    SELECT c.id FROM categories c 
    WHERE c.store_id = product_catalog.store_id 
    AND c.name = 'Classic'
    LIMIT 1
)
WHERE product_name IN ('Caramel Delight Croffle', 'Choco Marshmallow Croffle', 'Choco Nut Croffle', 'Tiramisu Croffle');

UPDATE product_catalog SET category_id = (
    SELECT c.id FROM categories c 
    WHERE c.store_id = product_catalog.store_id 
    AND c.name = 'Mini Croffle'
    LIMIT 1
)
WHERE product_name = 'Mini Croffle';

UPDATE product_catalog SET category_id = (
    SELECT c.id FROM categories c 
    WHERE c.store_id = product_catalog.store_id 
    AND c.name = 'Croffle Overload'
    LIMIT 1
)
WHERE product_name = 'Croffle Overload';