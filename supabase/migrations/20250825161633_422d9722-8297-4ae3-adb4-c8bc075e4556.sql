-- Phase 1: Store Inventory Cleanup (Handle all constraints)
-- Create backup table for existing inventory data
CREATE TABLE IF NOT EXISTS inventory_stock_backup AS 
SELECT * FROM inventory_stock;

-- Create backup for purchase_order_items that will be affected
CREATE TABLE IF NOT EXISTS purchase_order_items_backup AS
SELECT poi.* FROM purchase_order_items poi
WHERE poi.inventory_stock_id IS NOT NULL;

-- Create backup for recipe_ingredients that will be affected
CREATE TABLE IF NOT EXISTS recipe_ingredients_backup AS
SELECT ri.* FROM recipe_ingredients ri
WHERE ri.inventory_stock_id IS NOT NULL;

-- Temporarily make inventory_stock_id nullable in both tables
ALTER TABLE purchase_order_items 
ALTER COLUMN inventory_stock_id DROP NOT NULL;

ALTER TABLE recipe_ingredients
ALTER COLUMN inventory_stock_id DROP NOT NULL;

-- Set inventory references to NULL in purchase_order_items
UPDATE purchase_order_items SET inventory_stock_id = NULL WHERE inventory_stock_id IS NOT NULL;

-- Set inventory references to NULL in recipe_ingredients
UPDATE recipe_ingredients SET inventory_stock_id = NULL WHERE inventory_stock_id IS NOT NULL;

-- Clear all store inventory items (keep commissary untouched)
DELETE FROM inventory_stock;

-- Create standardized ingredient categories lookup
CREATE TABLE IF NOT EXISTS standardized_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL UNIQUE,
  standardized_name TEXT NOT NULL,
  standardized_unit inventory_unit NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standardized ingredients based on recipe analysis
INSERT INTO standardized_ingredients (ingredient_name, standardized_name, standardized_unit, category) VALUES
-- Base ingredients
('espresso shot', 'Espresso Shot', 'ml', 'base_ingredient'),
('coffee', 'Coffee Beans', 'g', 'base_ingredient'),
('milk', 'Fresh Milk', 'ml', 'base_ingredient'),
('whole milk', 'Fresh Milk', 'ml', 'base_ingredient'),
('steamed milk', 'Fresh Milk', 'ml', 'base_ingredient'),
-- Syrups and sauces
('vanilla syrup', 'Vanilla Syrup', 'ml', 'classic_sauce'),
('caramel syrup', 'Caramel Syrup', 'ml', 'classic_sauce'),
('chocolate syrup', 'Chocolate Syrup', 'ml', 'classic_sauce'),
('strawberry syrup', 'Strawberry Syrup', 'ml', 'premium_sauce'),
('chocolate sauce', 'Chocolate Sauce', 'ml', 'classic_sauce'),
('caramel sauce', 'Caramel Sauce', 'ml', 'classic_sauce'),
-- Toppings and crumbles
('whipped cream', 'Whipped Cream', 'ml', 'classic_topping'),
('chocolate crumble', 'Chocolate Crumble', 'g', 'classic_topping'),
('oreo crushed', 'Oreo Crushed', 'g', 'premium_topping'),
('strawberry bits', 'Strawberry Bits', 'g', 'premium_topping'),
-- Packaging
('cup', 'Regular Cup', 'pieces', 'packaging'),
('plastic cup', 'Plastic Cup', 'pieces', 'packaging'),
-- Pastries
('croissant', 'Regular Croissant', 'pieces', 'biscuit'),
('regular croissant', 'Regular Croissant', 'pieces', 'biscuit'),
-- Ice and water
('ice', 'Ice Cubes', 'g', 'base_ingredient'),
('water', 'Water', 'ml', 'base_ingredient'),
('hot water', 'Water', 'ml', 'base_ingredient'),
('cold water', 'Water', 'ml', 'base_ingredient')
ON CONFLICT (ingredient_name) DO NOTHING;