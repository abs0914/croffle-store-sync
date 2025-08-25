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
) 
SELECT 'Espresso Shot', 'finished_goods', 'ml', 0, 10, 2.50, 'prepared_ingredient', true
WHERE NOT EXISTS (SELECT 1 FROM commissary_inventory WHERE name = 'Espresso Shot')

UNION ALL

SELECT 'Regular Croissant', 'finished_goods', 'pieces', 0, 20, 15.00, 'finished_product', true
WHERE NOT EXISTS (SELECT 1 FROM commissary_inventory WHERE name = 'Regular Croissant');

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