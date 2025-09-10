-- Fix missing inventory mappings for coffee recipes
-- This will ensure proper inventory deduction for coffee products

-- Map unmapped Coffee Beans ingredients to the correct inventory item
UPDATE recipe_ingredients 
SET inventory_stock_id = '0e5262d6-1828-447a-ad18-93fdfd61fecb'
WHERE ingredient_name = 'Coffee Beans' 
  AND inventory_stock_id IS NULL
  AND recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    WHERE r.name IN (
      'Americano Hot', 'Americano Iced', 'Cafe Latte Hot', 'Cafe Latte Iced',
      'Cafe Mocha Hot', 'Cafe Mocha Iced', 'Cappuccino Hot', 'Cappuccino Iced',
      'Caramel Latte Hot', 'Caramel Latte Iced'
    )
  );

-- Map unmapped Vanilla Syrup ingredient for Caramel Latte Iced
UPDATE recipe_ingredients 
SET inventory_stock_id = 'ece8686a-2839-4e8a-9594-2462756ab535'
WHERE ingredient_name = 'Vanilla Syrup' 
  AND inventory_stock_id IS NULL
  AND recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    WHERE r.name = 'Caramel Latte Iced'
  );

-- Verification: Check all coffee recipe ingredients are now properly mapped
SELECT 
  r.name as recipe_name,
  ri.ingredient_name,
  ri.quantity,
  ri.unit,
  ri.inventory_stock_id,
  ist.item as inventory_item,
  ist.stock_quantity,
  CASE 
    WHEN ri.inventory_stock_id IS NULL THEN 'UNMAPPED - NEEDS FIXING'
    ELSE 'MAPPED - OK'
  END as mapping_status
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
WHERE r.name IN (
  'Americano Hot', 'Americano Iced', 'Cafe Latte Hot', 'Cafe Latte Iced',
  'Cafe Mocha Hot', 'Cafe Mocha Iced', 'Cappuccino Hot', 'Cappuccino Iced',
  'Caramel Latte Hot', 'Caramel Latte Iced'
)
ORDER BY r.name, ri.ingredient_name;