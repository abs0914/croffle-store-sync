-- Create recipe template for Crushed Oreo if it doesn't exist
INSERT INTO recipe_templates (
  name,
  description,
  category_name,
  recipe_type,
  serving_size,
  instructions,
  suggested_price,
  is_active
) 
SELECT 
  'Crushed Oreo',
  'Crushed Oreo cookies topping',
  'addon',
  'single',
  1,
  'Sprinkle crushed Oreo cookies over croffle as desired',
  10.00,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM recipe_templates WHERE name = 'Crushed Oreo'
);

-- Create recipe template ingredients for Crushed Grahams
INSERT INTO recipe_template_ingredients (
  recipe_template_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
) SELECT 
  rt.id,
  'Crushed Grahams',
  1,
  'portion',
  1.00
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
  cost_per_unit
) SELECT 
  rt.id,
  'Crushed Oreo',
  1,
  'portion',
  2.50
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

-- Create recipe ingredients for new recipes linking directly to inventory stock
INSERT INTO recipe_ingredients (
  recipe_id,
  inventory_stock_id,
  quantity,
  unit,
  cost_per_unit
) SELECT 
  r.id,
  ist.id,
  1,
  'portion',
  CASE 
    WHEN r.name = 'Crushed Oreo' THEN 2.50
    WHEN r.name = 'Crushed Grahams' THEN 1.00
    ELSE 1.00
  END
FROM recipes r
JOIN inventory_stock ist ON (
  (r.name = 'Crushed Oreo' AND LOWER(TRIM(ist.item)) LIKE '%crushed oreo%') OR
  (r.name = 'Crushed Grahams' AND LOWER(TRIM(ist.item)) LIKE '%crushed grahams%')
) AND ist.store_id = r.store_id
WHERE r.name IN ('Crushed Oreo', 'Crushed Grahams')
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND ri.inventory_stock_id = ist.id
  );

-- Update product catalog to link to the correct recipes
UPDATE product_catalog 
SET recipe_id = r.id,
    updated_at = NOW()
FROM recipes r
WHERE product_catalog.product_name = r.name
  AND product_catalog.store_id = r.store_id
  AND product_catalog.recipe_id IS NULL
  AND r.name IN ('Crushed Oreo', 'Crushed Grahams');