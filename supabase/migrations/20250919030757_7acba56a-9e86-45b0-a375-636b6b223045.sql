-- Add final missing items to complete inventory synchronization
INSERT INTO inventory_stock (
  store_id,
  item,
  unit,
  stock_quantity,
  minimum_threshold,
  cost,
  item_category,
  is_active,
  created_at,
  updated_at
) VALUES 
-- Add Oreo Crushed to Gaisano Capital SRP
((SELECT id FROM stores WHERE name = 'Gaisano Capital SRP'), 'Oreo Crushed', 'pieces', 50, 5, 2.00, 'premium_topping', true, NOW(), NOW()),
-- Add Chocolate Crumbs to Sugbo Mercado
((SELECT id FROM stores WHERE name LIKE '%Sugbo%'), 'Chocolate Crumbs', 'portion', 50, 5, 2.50, 'premium_topping', true, NOW(), NOW());