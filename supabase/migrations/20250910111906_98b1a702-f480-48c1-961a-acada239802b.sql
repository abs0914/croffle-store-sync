-- Phase 1: Data Correction - Fix Recipe Templates
-- Step 1: Update "Espresso Shot" to "Coffee Beans" in all recipe templates
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Coffee Beans'
WHERE ingredient_name = 'Espresso Shot';

-- Step 2: Fix template quantities from generic "1 piece" to specific amounts
-- Coffee/Espresso - 18g per shot
UPDATE recipe_template_ingredients 
SET quantity = 18, unit = 'g'
WHERE ingredient_name = 'Coffee Beans' AND unit = 'piece';

-- Milk - 150ml for lattes, 120ml for other drinks
UPDATE recipe_template_ingredients 
SET quantity = 150, unit = 'ml'
WHERE ingredient_name = 'Milk' AND unit = 'piece';

-- Syrups - 30ml standard serving
UPDATE recipe_template_ingredients 
SET quantity = 30, unit = 'ml'
WHERE ingredient_name LIKE '%Syrup%' AND unit = 'piece';

-- Update Caramel Syrup specifically
UPDATE recipe_template_ingredients 
SET quantity = 30, unit = 'ml'
WHERE ingredient_name = 'Caramel Syrup' AND unit = 'piece';

-- Update Chocolate Syrup specifically  
UPDATE recipe_template_ingredients 
SET quantity = 30, unit = 'ml'
WHERE ingredient_name = 'Chocolate Syrup' AND unit = 'piece';

-- Update Vanilla Syrup specifically
UPDATE recipe_template_ingredients 
SET quantity = 30, unit = 'ml'
WHERE ingredient_name = 'Vanilla Syrup' AND unit = 'piece';

-- Ice - 100g per drink
UPDATE recipe_template_ingredients 
SET quantity = 100, unit = 'g'
WHERE ingredient_name = 'Ice' AND unit = 'piece';

-- Whipped Cream - 50ml per serving
UPDATE recipe_template_ingredients 
SET quantity = 50, unit = 'ml'
WHERE ingredient_name = 'Whipped Cream' AND unit = 'piece';

-- Step 3: Add missing ingredients to templates that need them
-- Add Espresso Shot (now Coffee Beans) to Americano Iced if missing
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT id, 'Coffee Beans', 18, 'g', 2.00
FROM recipe_templates rt
WHERE rt.name = 'Americano Iced'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti 
    WHERE rti.recipe_template_id = rt.id 
    AND rti.ingredient_name IN ('Coffee Beans', 'Espresso Shot')
  );

-- Add Vanilla Syrup to Caramel Latte Iced if missing  
INSERT INTO recipe_template_ingredients (recipe_template_id, ingredient_name, quantity, unit, cost_per_unit)
SELECT id, 'Vanilla Syrup', 15, 'ml', 1.50
FROM recipe_templates rt
WHERE rt.name = 'Caramel Latte Iced'
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti 
    WHERE rti.recipe_template_id = rt.id 
    AND rti.ingredient_name = 'Vanilla Syrup'
  );

-- Step 4: Verify data integrity
-- Check that all templates now have Coffee Beans instead of Espresso Shot
SELECT 
  rt.name,
  rti.ingredient_name,
  rti.quantity,
  rti.unit
FROM recipe_templates rt
JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
WHERE rti.ingredient_name IN ('Coffee Beans', 'Espresso Shot')
ORDER BY rt.name, rti.ingredient_name;