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
  'bc554645-104d-4f6b-ab7a-89d24ff32b83', -- Sugbo Mercado (IT Park, Cebu) store ID
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
  WHERE store_id = 'bc554645-104d-4f6b-ab7a-89d24ff32b83' 
  AND item = 'Chocolate Sauce'
);