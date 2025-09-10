-- Fix Strawberry Syrup inventory deduction by correcting store references
-- The issue: Recipe ingredients are pointing to Strawberry Syrup from different stores
-- The transaction is at Sugbo Mercado (store: d7c47e6b-f20a-4543-a6bd-000398f72df5)
-- The correct Strawberry Syrup inventory for this store is: 065c32e2-defc-4855-8b3a-16f82075134e

-- Update recipe ingredients to point to correct store's Strawberry Syrup inventory
UPDATE recipe_ingredients 
SET inventory_stock_id = '065c32e2-defc-4855-8b3a-16f82075134e'
WHERE ingredient_name = 'Strawberry Syrup' 
  AND id IN (
    '931247e1-1f4b-4865-94d0-0ca31bf374ee', -- Oreo Strawberry Blended
    '780abe46-e85e-470f-99bf-5de1f7a6502f', -- Strawberry Kiss Blended  
    '15613a6d-34f8-4adc-a0b6-0abef1ea1cea'  -- Strawberry Latte
  );

-- Verification: Check that all Strawberry Syrup ingredients now point to the same inventory
SELECT 
  r.name as recipe_name,
  ri.ingredient_name,
  ri.quantity,
  ri.unit,
  ri.inventory_stock_id,
  ist.item,
  ist.store_id,
  s.name as store_name,
  ist.stock_quantity
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
LEFT JOIN stores s ON ist.store_id = s.id
WHERE r.name IN ('Oreo Strawberry Blended', 'Strawberry Kiss Blended', 'Strawberry Latte')
  AND ri.ingredient_name = 'Strawberry Syrup'
ORDER BY r.name;