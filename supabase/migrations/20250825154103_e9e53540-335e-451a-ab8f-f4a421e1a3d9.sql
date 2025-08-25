-- Add missing inventory items that are commonly used in recipes
-- These were identified from the master recipe imports

-- Add Espresso Shot - commonly used in coffee-based recipes
INSERT INTO commissary_inventory (
  name, 
  category, 
  unit, 
  current_stock, 
  minimum_threshold, 
  unit_cost, 
  item_type, 
  is_active
) VALUES (
  'Espresso Shot', 
  'beverage_ingredient', 
  'ml', 
  0, 
  10, 
  2.50, 
  'prepared_ingredient', 
  true
);

-- Standardize naming for existing inventory items to fix case sensitivity issues
UPDATE commissary_inventory 
SET name = 'Whipped Cream' 
WHERE name ILIKE 'whipped cream' AND name != 'Whipped Cream';

UPDATE commissary_inventory 
SET name = 'Chocolate Sauce' 
WHERE name ILIKE 'chocolate sauce' AND name != 'Chocolate Sauce';

UPDATE commissary_inventory 
SET name = 'Vanilla Syrup' 
WHERE name ILIKE 'vanilla syrup' AND name != 'Vanilla Syrup';

UPDATE commissary_inventory 
SET name = 'Caramel Sauce' 
WHERE name ILIKE 'caramel sauce' AND name != 'Caramel Sauce';

-- Add other commonly missing ingredients identified from imports
INSERT INTO commissary_inventory (
  name, 
  category, 
  unit, 
  current_stock, 
  minimum_threshold, 
  unit_cost, 
  item_type, 
  is_active
) VALUES 
(
  'Coffee Shot', 
  'beverage_ingredient', 
  'ml', 
  0, 
  20, 
  1.50, 
  'prepared_ingredient', 
  true
),
(
  'Steamed Milk', 
  'beverage_ingredient', 
  'ml', 
  0, 
  50, 
  0.80, 
  'prepared_ingredient', 
  true
),
(
  'Foam Milk', 
  'beverage_ingredient', 
  'ml', 
  0, 
  30, 
  0.60, 
  'prepared_ingredient', 
  true
),
(
  'Hot Water', 
  'beverage_ingredient', 
  'ml', 
  0, 
  100, 
  0.10, 
  'prepared_ingredient', 
  true
)
ON CONFLICT (name) DO NOTHING;