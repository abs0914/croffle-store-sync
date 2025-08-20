-- Phase 1: Critical Fixes - Fix inventory categorization and create missing recipes

-- Update inventory categories for critical items
UPDATE inventory_stock 
SET item_category = 'biscuit'
WHERE item = 'REGULAR CROISSANT' AND item_category = 'base_ingredient';

UPDATE inventory_stock 
SET item_category = 'premium_topping'
WHERE item = 'Dark Chocolate' AND item_category = 'base_ingredient';

UPDATE inventory_stock 
SET item_category = 'premium_topping'
WHERE item = 'Tiramisu' AND item_category = 'base_ingredient';

UPDATE inventory_stock 
SET item_category = 'classic_topping'
WHERE item = 'WHIPPED CREAM' AND item_category = 'base_ingredient';

UPDATE inventory_stock 
SET item_category = 'premium_sauce'
WHERE item IN ('Blueberry Jam', 'Mango Jam', 'Strawberry Jam') AND item_category != 'premium_sauce';

UPDATE inventory_stock 
SET item_category = 'premium_topping'
WHERE item IN ('Biscoff', 'Biscoff Crushed', 'Nutella') AND item_category != 'premium_topping';

-- Assign categories to uncategorized products - assign beverages category
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Beverages' LIMIT 1)
WHERE category_id IS NULL AND name ILIKE '%latte%';

UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Beverages' LIMIT 1) 
WHERE category_id IS NULL AND name ILIKE '%americano%';

UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Beverages' LIMIT 1)
WHERE category_id IS NULL AND name ILIKE '%cappuccino%';

UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Beverages' LIMIT 1)
WHERE category_id IS NULL AND name ILIKE '%mocha%';

-- Assign sauce/jam products to appropriate category
UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Add-ons' LIMIT 1)
WHERE category_id IS NULL AND name ILIKE '%sauce%';

UPDATE products 
SET category_id = (SELECT id FROM categories WHERE name = 'Add-ons' LIMIT 1)
WHERE category_id IS NULL AND name ILIKE '%jam%';