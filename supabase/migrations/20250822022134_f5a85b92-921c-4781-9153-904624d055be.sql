-- Add Chocolate Sauce inventory item for Sugbo Mercado (IT Park, Cebu)
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
) 
SELECT 
  'd7c47e6b-f20a-4543-a6bd-000398f72df5', -- Sugbo Mercado (IT Park, Cebu) store ID
  'Chocolate Sauce',
  'ml',
  1000,
  100,
  5.00,
  'premium_sauce',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_stock 
  WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND item = 'Chocolate Sauce'
);