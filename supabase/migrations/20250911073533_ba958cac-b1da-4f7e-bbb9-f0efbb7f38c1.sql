-- Remove Rectangle ingredient from regular croffle recipes and templates
-- Phase 1: Backup current state (for reference)

-- Phase 2: Remove Rectangle from recipe template ingredients (except legitimate Rectangle products)
DELETE FROM recipe_template_ingredients 
WHERE ingredient_name = 'Rectangle' 
  AND recipe_template_id IN (
    SELECT rt.id 
    FROM recipe_templates rt 
    WHERE rt.name NOT ILIKE '%rectangle%' 
      AND rt.is_active = true
  );

-- Phase 3: Remove Rectangle from deployed recipe ingredients 
DELETE FROM recipe_ingredients 
WHERE ingredient_name = 'Rectangle' 
  AND recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    JOIN recipe_templates rt ON r.template_id = rt.id
    WHERE rt.name NOT ILIKE '%rectangle%' 
      AND r.is_active = true
  );

-- Recalculate recipe costs after ingredient removal
UPDATE recipes SET
  total_cost = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ),
  cost_per_serving = (
    SELECT COALESCE(SUM(ri.quantity * ri.cost_per_unit), 0) / GREATEST(serving_size, 1)
    FROM recipe_ingredients ri
    WHERE ri.recipe_id = recipes.id
  ),
  updated_at = NOW()
WHERE id IN (
  SELECT r.id 
  FROM recipes r 
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name NOT ILIKE '%rectangle%' 
    AND r.is_active = true
);

-- Phase 4: Remove Rectangle conversion mappings
DELETE FROM conversion_mappings 
WHERE recipe_ingredient_name = 'Rectangle';

-- Phase 5: Clean up recipe ingredient mappings if they exist
DELETE FROM recipe_ingredient_mappings 
WHERE ingredient_name = 'Rectangle' 
  AND recipe_id IN (
    SELECT r.id 
    FROM recipes r 
    JOIN recipe_templates rt ON r.template_id = rt.id
    WHERE rt.name NOT ILIKE '%rectangle%' 
      AND r.is_active = true
  );

-- Verification queries (these will show what remains)
-- Check remaining Rectangle ingredients in templates
SELECT rt.name as template_name, rti.ingredient_name, rti.quantity, rti.unit
FROM recipe_template_ingredients rti
JOIN recipe_templates rt ON rti.recipe_template_id = rt.id
WHERE rti.ingredient_name = 'Rectangle'
  AND rt.is_active = true;

-- Check remaining Rectangle ingredients in recipes  
SELECT r.name as recipe_name, s.name as store_name, ri.ingredient_name, ri.quantity, ri.unit
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN stores s ON r.store_id = s.id
WHERE ri.ingredient_name = 'Rectangle'
  AND r.is_active = true;

-- Check remaining conversion mappings
SELECT cm.*, ist.item as inventory_item
FROM conversion_mappings cm
JOIN inventory_stock ist ON cm.inventory_stock_id = ist.id
WHERE cm.recipe_ingredient_name = 'Rectangle';

-- Summary of changes
SELECT 
  'Cleanup Complete' as status,
  (SELECT COUNT(*) FROM recipe_template_ingredients WHERE ingredient_name = 'Rectangle') as templates_with_rectangle,
  (SELECT COUNT(*) FROM recipe_ingredients WHERE ingredient_name = 'Rectangle') as recipes_with_rectangle,
  (SELECT COUNT(*) FROM conversion_mappings WHERE recipe_ingredient_name = 'Rectangle') as rectangle_mappings_remaining;