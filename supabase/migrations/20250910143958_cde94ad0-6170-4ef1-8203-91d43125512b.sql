-- Update Premium - Dark Chocolate recipe template to use "Chocolate Crumble" instead of "Chocolate Crumbs"

-- First, update the recipe template ingredients
UPDATE recipe_template_ingredients 
SET ingredient_name = 'Chocolate Crumble'
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates WHERE name = 'Premium - Dark Chocolate'
)
AND ingredient_name = 'Chocolate Crumbs';

-- Update any deployed recipes that use this template
UPDATE recipe_ingredients 
SET ingredient_name = 'Chocolate Crumble'
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name = 'Premium - Dark Chocolate'
)
AND ingredient_name = 'Chocolate Crumbs';

-- Update any existing inventory mappings
UPDATE recipe_ingredient_mappings
SET ingredient_name = 'Chocolate Crumble'
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name = 'Premium - Dark Chocolate'
)
AND ingredient_name = 'Chocolate Crumbs';

-- Verify the changes
SELECT 
  'Updated Premium - Dark Chocolate' as status,
  COUNT(*) as template_ingredients_updated
FROM recipe_template_ingredients rti
JOIN recipe_templates rt ON rti.recipe_template_id = rt.id
WHERE rt.name = 'Premium - Dark Chocolate' 
AND rti.ingredient_name = 'Chocolate Crumble';