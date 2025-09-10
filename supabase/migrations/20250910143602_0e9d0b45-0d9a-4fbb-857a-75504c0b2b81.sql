-- Create inventory mappings for Premium products directly
-- This will map the new Premium template ingredients to inventory items

INSERT INTO recipe_ingredient_mappings (
  recipe_id,
  ingredient_name,
  inventory_stock_id,
  conversion_factor,
  created_at,
  updated_at
)
SELECT DISTINCT
  r.id as recipe_id,
  ri.ingredient_name,
  ist.id as inventory_stock_id,
  1.0 as conversion_factor,
  NOW(),
  NOW()
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN inventory_stock ist ON (
  LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name)) AND
  ist.store_id = r.store_id AND
  ist.is_active = true
)
WHERE r.template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name IN ('Premium - Choco Overload', 'Premium - Matcha', 'Premium - Dark Chocolate')
)
AND r.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM recipe_ingredient_mappings rim
  WHERE rim.recipe_id = r.id 
  AND rim.ingredient_name = ri.ingredient_name
);

-- Now let's verify our Premium products are ready
SELECT 
  'Summary' as type,
  COUNT(DISTINCT rt.name) as premium_templates_created,
  COUNT(DISTINCT r.id) as premium_recipes_deployed,
  COUNT(DISTINCT rim.id) as inventory_mappings_created,
  COUNT(DISTINCT ist.id) as chocolate_crumbs_inventory_items
FROM recipe_templates rt
LEFT JOIN recipes r ON rt.id = r.template_id
LEFT JOIN recipe_ingredient_mappings rim ON r.id = rim.recipe_id
LEFT JOIN inventory_stock ist ON (ist.item = 'Chocolate Crumbs' AND ist.is_active = true)
WHERE rt.name IN ('Premium - Choco Overload', 'Premium - Matcha', 'Premium - Dark Chocolate');