-- Fix ingredient categories and inventory item naming for Sugbo Mercado (CORRECTED)
-- Store ID: d7c47e6b-f20a-4543-a6bd-000398f72df5

-- 1. Update Peanut ingredient group from 'base' to 'topping' in both Mini Croffle and Croffle Overload
UPDATE recipe_ingredients 
SET 
  ingredient_group_name = 'topping',
  is_optional = true,
  updated_at = NOW()
WHERE id IN ('53719808-62f4-41cb-8aec-37ed702f2365', '8d46d590-c5ea-45a2-abcc-6ff2c83fdf0a');

-- 2. Update Tiramisu ingredient group from 'topping' to 'sauce' in Mini Croffle
UPDATE recipe_ingredients 
SET 
  ingredient_group_name = 'sauce',
  is_optional = true,
  updated_at = NOW()
WHERE id = '8c10c465-41bf-44c1-9bb3-6d2d1bc0944c';

-- 3. Update inventory item categories using valid enum values
UPDATE inventory_stock 
SET 
  item_category = 'classic_topping',
  updated_at = NOW()
WHERE id = '1be037f2-aa75-4759-99f4-5083507a69c6'; -- Peanut

UPDATE inventory_stock 
SET 
  item_category = 'premium_sauce',
  updated_at = NOW()
WHERE id = 'ebe11861-3741-43e5-8e93-889027159338'; -- Tiramisu

-- 4. Rename "Popsicle" to "Popsicle Stick" in inventory
UPDATE inventory_stock 
SET 
  item = 'Popsicle Stick',
  updated_at = NOW()
WHERE id = 'c7e95ff0-c496-4882-b1c4-ce59e17233fc' 
  AND item = 'Popsicle';

-- Verification: Check the updated ingredient categories
SELECT 
  r.name as recipe_name,
  ist.item as ingredient_name,
  ri.ingredient_group_name,
  ist.item_category,
  ri.is_optional,
  ri.quantity,
  ri.unit
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN inventory_stock ist ON ist.id = ri.inventory_stock_id
WHERE r.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND r.name IN ('Mini Croffle', 'Croffle Overload')
  AND (ist.item ILIKE '%peanut%' OR ist.item ILIKE '%tiramisu%')
ORDER BY r.name, ist.item;

-- Verification: Check renamed inventory item
SELECT id, item, item_category, updated_at
FROM inventory_stock 
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND item LIKE '%Popsicle%'
ORDER BY item;