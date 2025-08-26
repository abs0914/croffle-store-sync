-- Remove ice and water ingredients from recipe templates (corrected version)

-- Phase 1: Remove Ice ingredients from recipes
DELETE FROM recipe_template_ingredients 
WHERE ingredient_name ILIKE '%ice%' 
AND recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name IN (
    'Americano (Iced)', 'Cafe Latte (Iced)', 'Cafe Mocha (Iced)', 
    'Cappuccino (Iced)', 'Matcha Blended', 'Oreo Strawberry Blended', 
    'Strawberry Kiss Blended', 'Vanilla Caramel Iced'
  )
);

-- Phase 2: Remove water ingredients from Americano recipes (excluding bottled water)
DELETE FROM recipe_template_ingredients 
WHERE ingredient_name ILIKE '%water%' 
AND ingredient_name NOT ILIKE '%bottled water%'
AND recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name LIKE '%Americano%'
);

-- Phase 3: Clean up any orphaned inventory stock items for ice and water (excluding bottled water)
DELETE FROM inventory_stock 
WHERE LOWER(item) IN ('ice', 'water', 'hot water', 'cold water')
AND LOWER(item) NOT LIKE '%bottled%';

-- Phase 4: Log successful ingredient removal
DO $$
BEGIN
  RAISE NOTICE 'Successfully removed ice and water ingredients from recipe templates';
  RAISE NOTICE 'Ice removed from iced beverage recipes';
  RAISE NOTICE 'Water removed from Americano recipes (hot/cold water only)';
  RAISE NOTICE 'Bottled water products remain unchanged';
END $$;