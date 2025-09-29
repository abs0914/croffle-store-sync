-- Create recipe template for Crushed Oreo if it doesn't exist
INSERT INTO recipe_templates (
  name,
  description,
  category_name,
  recipe_type,
  serving_size,
  instructions,
  suggested_price,
  is_active,
  created_by
) 
SELECT 
  'Crushed Oreo',
  'Crushed Oreo cookies topping',
  'addon',
  'single',
  1,
  'Sprinkle crushed Oreo cookies over croffle as desired',
  10.00,
  true,
  (SELECT id FROM app_users WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_templates WHERE name = 'Crushed Oreo'
);

-- Create recipe template ingredients for Crushed Grahams
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  category,
  is_choice_ingredient
) SELECT 
  rt.id,
  'Crushed Grahams',
  1,
  'portion',
  1.00,
  'topping',
  false
FROM recipe_templates rt 
WHERE rt.name = 'Crushed Grahams'
AND NOT EXISTS (
  SELECT 1 FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = rt.id 
  AND rti.ingredient_name = 'Crushed Grahams'
);

-- Create recipe template ingredients for Crushed Oreo
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  category,
  is_choice_ingredient
) SELECT 
  rt.id,
  'Crushed Oreo',
  1,
  'portion',
  2.50,
  'topping',
  false
FROM recipe_templates rt 
WHERE rt.name = 'Crushed Oreo'
AND NOT EXISTS (
  SELECT 1 FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = rt.id 
  AND rti.ingredient_name = 'Crushed Oreo'
);

-- Create recipes for Crushed Oreo where product catalog entries exist but have null recipe_id
INSERT INTO recipes (
  name,
  store_id,
  template_id,
  is_active,
  serving_size,
  total_cost,
  cost_per_serving,
  instructions,
  recipe_type
) SELECT DISTINCT
  'Crushed Oreo',
  pc.store_id,
  rt.id,
  true,
  1,
  2.50,
  2.50,
  'Sprinkle crushed Oreo cookies over croffle as desired',
  'single'
FROM product_catalog pc
CROSS JOIN recipe_templates rt
WHERE pc.product_name = 'Crushed Oreo'
  AND pc.recipe_id IS NULL
  AND rt.name = 'Crushed Oreo'
  AND NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.name = 'Crushed Oreo' 
    AND r.store_id = pc.store_id
  );

-- Create recipes for Crushed Grahams where product catalog entries exist but have null recipe_id  
INSERT INTO recipes (
  name,
  store_id,
  template_id,
  is_active,
  serving_size,
  total_cost,
  cost_per_serving,
  instructions,
  recipe_type
) SELECT DISTINCT
  'Crushed Grahams',
  pc.store_id,
  rt.id,
  true,
  1,
  1.00,
  1.00,
  'Sprinkle over croffle as desired',
  'single'
FROM product_catalog pc
CROSS JOIN recipe_templates rt
WHERE pc.product_name = 'Crushed Grahams'
  AND pc.recipe_id IS NULL
  AND rt.name = 'Crushed Grahams'
  AND NOT EXISTS (
    SELECT 1 FROM recipes r 
    WHERE r.name = 'Crushed Grahams' 
    AND r.store_id = pc.store_id
  );

-- Create recipe ingredients for new recipes
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
) SELECT 
  r.id,
  r.name,
  1,
  'portion',
  CASE 
    WHEN r.name = 'Crushed Oreo' THEN 2.50
    WHEN r.name = 'Crushed Grahams' THEN 1.00
    ELSE 1.00
  END
FROM recipes r
WHERE r.name IN ('Crushed Oreo', 'Crushed Grahams')
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.ingredient_name = r.name
  );