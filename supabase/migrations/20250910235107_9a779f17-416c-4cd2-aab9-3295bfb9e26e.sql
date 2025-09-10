-- Fix data integrity issue: Link products to their corresponding recipes
-- This addresses the inventory deduction failure for Transaction #20250911-5437-074005
-- Issue: Products exist but have NULL recipe_id, preventing inventory tracking

-- Link products to recipes for Sugbo Mercado (IT Park, Cebu) store
UPDATE products 
SET recipe_id = (
  SELECT r.id 
  FROM recipes r 
  WHERE r.name = products.name 
    AND r.store_id = products.store_id 
    AND r.is_active = true 
  LIMIT 1
)
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND recipe_id IS NULL
  AND name IN (
    'Creamer Sachet', 'Dark Chocolate Sauce', 'Mango Jam', 'Marshmallow', 
    'Mini Take Out Box', 'Nutella Sauce', 'Nutella Topping', 'Oreo Cookies', 
    'Oreo Crushed', 'Paper Bag 06', 'Paper Bag 20', 'Peanut', 'Rectangle', 
    'Stirrer', 'Strawberry Jam', 'Sugar Sachet', 'Take out box w cover', 'Tiramisu',
    'Chocolate' -- Adding this as it was in the successful transaction
  );

-- Also fix this issue across all stores to prevent future problems
UPDATE products 
SET recipe_id = (
  SELECT r.id 
  FROM recipes r 
  WHERE r.name = products.name 
    AND r.store_id = products.store_id 
    AND r.is_active = true 
  LIMIT 1
)
WHERE recipe_id IS NULL
  AND EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.name = products.name 
      AND r.store_id = products.store_id 
      AND r.is_active = true
  );

-- Verify the fix by checking linked products
SELECT 
  p.name,
  p.recipe_id,
  r.name as linked_recipe,
  s.name as store_name
FROM products p
LEFT JOIN recipes r ON p.recipe_id = r.id
LEFT JOIN stores s ON p.store_id = s.id
WHERE p.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND p.name IN (
    'Creamer Sachet', 'Dark Chocolate Sauce', 'Mango Jam', 'Marshmallow', 
    'Mini Take Out Box', 'Nutella Sauce', 'Nutella Topping', 'Oreo Cookies', 
    'Oreo Crushed', 'Paper Bag 06', 'Paper Bag 20', 'Peanut', 'Rectangle', 
    'Stirrer', 'Strawberry Jam', 'Sugar Sachet', 'Take out box w cover', 'Tiramisu'
  )
ORDER BY p.name;