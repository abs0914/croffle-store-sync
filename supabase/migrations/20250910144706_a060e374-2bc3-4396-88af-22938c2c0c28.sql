-- Update deployed recipe ingredients to match new templates and create inventory mappings
-- First, clear existing recipe ingredients for both templates
DELETE FROM recipe_ingredients 
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
  AND r.is_active = true
);

-- Clear existing mappings for these recipes
DELETE FROM recipe_ingredient_mappings 
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
  AND r.is_active = true
);

-- Insert new recipe ingredients from updated templates with proper unit mapping
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at,
  updated_at
)
SELECT 
  r.id as recipe_id,
  rti.ingredient_name,
  rti.quantity,
  CASE 
    WHEN LOWER(rti.unit) = 'scoop' THEN 'scoop'::inventory_unit
    WHEN LOWER(rti.unit) = 'serving' THEN 'serving'::inventory_unit
    WHEN LOWER(rti.unit) = 'portion' THEN 'portion'::inventory_unit
    WHEN LOWER(rti.unit) = 'pieces' THEN 'pieces'::inventory_unit
    ELSE 'pieces'::inventory_unit
  END,
  rti.cost_per_unit,
  NOW(),
  NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
  AND r.is_active = true;

-- Create inventory mappings for all ingredients
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
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN inventory_stock ist ON (
  (LOWER(TRIM(ist.item)) = LOWER(TRIM(ri.ingredient_name)) OR
   -- Handle specific name mappings
   (ri.ingredient_name = 'Popsicle Stick' AND ist.item = 'Popsicle Stick') OR
   (ri.ingredient_name = 'Mini Take Out Box' AND ist.item = 'Mini Take Out Box') OR
   (ri.ingredient_name = 'Overload Cup' AND ist.item = 'Overload Cup') OR
   (ri.ingredient_name = 'Mini Spoon' AND ist.item = 'Mini Spoon') OR
   (ri.ingredient_name = 'Vanilla Ice Cream' AND ist.item = 'Vanilla Ice Cream')
  ) AND
  ist.store_id = r.store_id AND
  ist.is_active = true
)
WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = r.id 
    AND rim.ingredient_name = ri.ingredient_name
  );

-- Update recipe costs based on new ingredients
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
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
  AND r.is_active = true
);

-- Verify the updates
SELECT 
  'Mix & Match Recipe Update Summary' as status,
  COUNT(DISTINCT r.id) as recipes_updated,
  COUNT(DISTINCT ri.id) as ingredients_added,
  COUNT(DISTINCT rim.id) as mappings_created
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN recipe_ingredient_mappings rim ON r.id = rim.recipe_id
WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
  AND r.is_active = true;