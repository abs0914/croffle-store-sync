-- Add missing inventory items to Sugbo Mercado store
-- These items were identified as missing during template-to-inventory mapping analysis

INSERT INTO inventory_stock (
  store_id,
  item,
  unit,
  stock_quantity,
  minimum_threshold,
  cost,
  is_active,
  created_at,
  updated_at
) VALUES 
-- Get the Sugbo Mercado store ID and add missing items
(
  (SELECT id FROM stores WHERE name ILIKE '%sugbo%' LIMIT 1),
  'Nutella Topping',
  'pieces',
  50,
  5,
  15.00,
  true,
  NOW(),
  NOW()
),
(
  (SELECT id FROM stores WHERE name ILIKE '%sugbo%' LIMIT 1),
  'Peanut',
  'pieces', 
  50,
  5,
  8.00,
  true,
  NOW(),
  NOW()
),
(
  (SELECT id FROM stores WHERE name ILIKE '%sugbo%' LIMIT 1),
  'Tiramisu',
  'pieces',
  50,
  5,
  25.00,
  true,
  NOW(),
  NOW()
),
(
  (SELECT id FROM stores WHERE name ILIKE '%sugbo%' LIMIT 1),
  'Marshmallow',
  'pieces',
  50,
  5,
  12.00,
  true,
  NOW(),
  NOW()
),
(
  (SELECT id FROM stores WHERE name ILIKE '%sugbo%' LIMIT 1),
  'Strawberry Jam',
  'pieces',
  50,
  5,
  18.00,
  true,
  NOW(),
  NOW()
),
(
  (SELECT id FROM stores WHERE name ILIKE '%sugbo%' LIMIT 1),
  'Mango Jam',
  'pieces',
  50,
  5,
  18.00,
  true,
  NOW(),
  NOW()
),
(
  (SELECT id FROM stores WHERE name ILIKE '%sugbo%' LIMIT 1),  
  'Take out box w cover',
  'pieces',
  100,
  10,
  3.00,
  true,
  NOW(),
  NOW()
),
(
  (SELECT id FROM stores WHERE name ILIKE '%sugbo%' LIMIT 1),
  'Paper Bag 06',
  'pieces',
  100,
  10,
  2.00,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (store_id, item) DO NOTHING;

-- Verify the additions
SELECT 
  s.name as store_name,
  COUNT(ist.id) as total_inventory_items,
  COUNT(CASE WHEN ist.created_at > NOW() - INTERVAL '1 minute' THEN 1 END) as newly_added
FROM stores s
LEFT JOIN inventory_stock ist ON s.id = ist.store_id AND ist.is_active = true
WHERE s.name ILIKE '%sugbo%'
GROUP BY s.id, s.name;