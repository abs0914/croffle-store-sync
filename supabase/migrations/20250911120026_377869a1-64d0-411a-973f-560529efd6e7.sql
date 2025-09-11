-- Fix recipe ingredient quantities for inventory deduction issues

-- 1. Fix Mini Croffle recipes: Choco Flakes from 1.0 to 0.5 portions
UPDATE recipe_ingredients 
SET quantity = 0.5,
    updated_at = NOW()
WHERE ingredient_name = 'Choco Flakes Toppings'
AND recipe_id IN (
    SELECT id FROM recipes WHERE name LIKE '%Mini Croffle%'
)
AND quantity = 1.0;

-- 2. Fix Mini Croffle recipes: Caramel Sauce from 1.0 to 0.5 portions  
UPDATE recipe_ingredients
SET quantity = 0.5,
    updated_at = NOW()
WHERE ingredient_name = 'Caramel Sauce'
AND recipe_id IN (
    SELECT id FROM recipes WHERE name LIKE '%Mini Croffle%'
)
AND quantity = 1.0;

-- 3. Fix Oreo Strawberry Blended: Crushed Oreo from 1 to 2 portions
UPDATE recipe_ingredients
SET quantity = 2.0,
    updated_at = NOW()
WHERE ingredient_name = 'Crushed Oreo'
AND recipe_id IN (
    SELECT id FROM recipes WHERE name = 'Oreo Strawberry Blended'
)
AND quantity = 1.0;

-- 4. Fix Frappe Powder: from 1 piece to 30 grams with correct unit
UPDATE recipe_ingredients
SET quantity = 30.0,
    unit = 'g',
    updated_at = NOW()
WHERE ingredient_name = 'Frappe Powder'
AND recipe_id IN (
    SELECT id FROM recipes WHERE name = 'Oreo Strawberry Blended'
)
AND quantity = 1.0;

-- 5. Verify Croffle Overload Peanuts Toppings is set to 1 portion (not 2)
UPDATE recipe_ingredients
SET quantity = 1.0,
    updated_at = NOW()
WHERE ingredient_name = 'Peanuts Toppings'
AND recipe_id IN (
    SELECT id FROM recipes WHERE name = 'Croffle Overload'
)
AND quantity = 2.0;