-- Add missing inventory items with correct categories
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
  'Espresso Shot', 
  'finished_goods', 
  'ml', 
  0, 
  10, 
  2.50, 
  'prepared_ingredient', 
  true
),
(
  'Coffee Shot', 
  'finished_goods', 
  'ml', 
  0, 
  20, 
  1.50, 
  'prepared_ingredient', 
  true
),
(
  'Steamed Milk', 
  'finished_goods', 
  'ml', 
  0, 
  50, 
  0.80, 
  'prepared_ingredient', 
  true
),
(
  'Foam Milk', 
  'finished_goods', 
  'ml', 
  0, 
  30, 
  0.60, 
  'prepared_ingredient', 
  true
),
(
  'Hot Water', 
  'raw_materials', 
  'ml', 
  0, 
  100, 
  0.10, 
  'raw_material', 
  true
)
ON CONFLICT (name) DO NOTHING;

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