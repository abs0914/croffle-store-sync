-- Fix ingredient categories and inventory item naming for Sugbo Mercado
-- Store ID: fb822fcc-5c5b-4764-9dc9-a78bb4b3e104

-- Update Peanut from 'base' to 'topping' in Mini Croffle and Croffle Overload recipes
UPDATE recipe_ingredients 
SET 
  category = 'topping',
  is_optional = true,
  updated_at = NOW()
WHERE recipe_id IN (
  SELECT r.id 
  FROM recipes r 
  WHERE r.store_id = 'fb822fcc-5c5b-4764-9dc9-a78bb4b3e104'
    AND r.name IN ('Mini Croffle', 'Croffle Overload')
    AND r.is_active = true
)
AND ingredient_name ILIKE '%peanut%'
AND category = 'base';

-- Update Tiramisu from 'topping' to 'sauce' in Mini Croffle recipe
UPDATE recipe_ingredients 
SET 
  category = 'sauce',
  is_optional = true,
  updated_at = NOW()
WHERE recipe_id IN (
  SELECT r.id 
  FROM recipes r 
  WHERE r.store_id = 'fb822fcc-5c5b-4764-9dc9-a78bb4b3e104'
    AND r.name = 'Mini Croffle'
    AND r.is_active = true
)
AND ingredient_name ILIKE '%tiramisu%'
AND category = 'topping';

-- Update inventory item from "Popsicle" to "Popsicle Stick"
UPDATE inventory_stock 
SET 
  item = 'Popsicle Stick',
  updated_at = NOW()
WHERE store_id = 'fb822fcc-5c5b-4764-9dc9-a78bb4b3e104'
  AND item = 'Popsicle'
  AND is_active = true;

-- Verification queries (read-only)
-- Check updated ingredient categories
SELECT 
  r.name as recipe_name,
  ri.ingredient_name,
  ri.category,
  ri.is_optional
FROM recipe_ingredients ri
JOIN recipes r ON r.id = ri.recipe_id
WHERE r.store_id = 'fb822fcc-5c5b-4764-9dc9-a78bb4b3e104'
  AND r.name IN ('Mini Croffle', 'Croffle Overload')
  AND ri.ingredient_name ILIKE ANY(ARRAY['%peanut%', '%tiramisu%'])
ORDER BY r.name, ri.ingredient_name;

-- Check updated inventory item
SELECT 
  id,
  item,
  item_category,
  updated_at
FROM inventory_stock 
WHERE store_id = 'fb822fcc-5c5b-4764-9dc9-a78bb4b3e104'
  AND item = 'Popsicle Stick'
  AND is_active = true;