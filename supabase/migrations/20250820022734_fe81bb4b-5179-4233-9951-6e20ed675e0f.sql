-- Add item_category enum type and column to inventory_stock table
-- This will help standardize ingredient categorization for recipes and add-ons

-- Create enum type for inventory item categories
CREATE TYPE inventory_item_category AS ENUM (
  'base_ingredient',
  'classic_sauce', 
  'premium_sauce',
  'classic_topping',
  'premium_topping',
  'packaging',
  'biscuit'
);

-- Add item_category column to inventory_stock table
ALTER TABLE inventory_stock 
ADD COLUMN item_category inventory_item_category DEFAULT 'base_ingredient';

-- Categorize existing inventory items based on naming patterns
UPDATE inventory_stock 
SET item_category = 'classic_sauce'
WHERE LOWER(item) LIKE '%sauce%' 
  AND (LOWER(item) LIKE '%chocolate%' 
       OR LOWER(item) LIKE '%vanilla%' 
       OR LOWER(item) LIKE '%caramel%'
       OR LOWER(item) LIKE '%strawberry%'
       OR LOWER(item) LIKE '%blueberry%');

UPDATE inventory_stock 
SET item_category = 'premium_sauce'
WHERE LOWER(item) LIKE '%nutella%' 
  OR LOWER(item) LIKE '%matcha%'
  OR LOWER(item) LIKE '%mango%'
  OR (LOWER(item) LIKE '%sauce%' AND LOWER(item) LIKE '%premium%');

UPDATE inventory_stock 
SET item_category = 'classic_topping'
WHERE LOWER(item) LIKE '%powder%' 
  OR LOWER(item) LIKE '%sugar%'
  OR LOWER(item) LIKE '%crumbs%'
  OR LOWER(item) LIKE '%chips%'
  OR LOWER(item) LIKE '%sprinkles%';

UPDATE inventory_stock 
SET item_category = 'premium_topping'
WHERE LOWER(item) LIKE '%almonds%' 
  OR LOWER(item) LIKE '%nuts%'
  OR LOWER(item) LIKE '%oreo%'
  OR LOWER(item) LIKE '%cookie%'
  OR (LOWER(item) LIKE '%topping%' AND LOWER(item) LIKE '%premium%');

UPDATE inventory_stock 
SET item_category = 'packaging'
WHERE LOWER(item) LIKE '%box%' 
  OR LOWER(item) LIKE '%bag%'
  OR LOWER(item) LIKE '%cup%'
  OR LOWER(item) LIKE '%container%'
  OR LOWER(item) LIKE '%wrapper%'
  OR LOWER(item) LIKE '%napkin%';

UPDATE inventory_stock 
SET item_category = 'biscuit'
WHERE LOWER(item) LIKE '%biscuit%' 
  OR LOWER(item) LIKE '%dough%'
  OR LOWER(item) LIKE '%croffle%base%'
  OR LOWER(item) = 'croffle';