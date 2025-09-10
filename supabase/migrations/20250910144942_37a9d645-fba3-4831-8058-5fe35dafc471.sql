-- Fix the missing Popsicle mapping for Croffle Overload
-- First check and create mappings for the remaining unmapped ingredient
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
  'Popsicle' as ingredient_name,
  ist.id as inventory_stock_id,
  1.0 as conversion_factor,
  NOW(),
  NOW()
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
JOIN inventory_stock ist ON (
  ist.item = 'Popsicle' AND
  ist.store_id = r.store_id AND
  ist.is_active = true
)
WHERE rt.name = 'Croffle Overload'
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredient_mappings rim
    WHERE rim.recipe_id = r.id 
    AND rim.ingredient_name = 'Popsicle'
  );

-- Final verification of Mix & Match inventory mapping status
SELECT 
  'FINAL MAPPING STATUS' as report_type,
  rt.name as product_category,
  COUNT(DISTINCT r.id) as total_recipes,
  COUNT(DISTINCT ri.ingredient_name) as unique_ingredients,
  COUNT(DISTINCT rim.id) as successfully_mapped,
  COUNT(DISTINCT CASE WHEN rim.id IS NULL THEN ri.ingredient_name END) as still_unmapped,
  ROUND(COUNT(DISTINCT rim.id) * 100.0 / NULLIF(COUNT(DISTINCT ri.ingredient_name), 0), 1) as mapping_percentage
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN recipe_ingredient_mappings rim ON r.id = rim.recipe_id 
  AND rim.ingredient_name = ri.ingredient_name
WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
  AND r.is_active = true
GROUP BY rt.name
UNION ALL
SELECT 
  'OVERALL SUMMARY' as report_type,
  'Both Products Combined' as product_category,
  COUNT(DISTINCT r.id) as total_recipes,
  COUNT(DISTINCT ri.ingredient_name) as unique_ingredients,
  COUNT(DISTINCT rim.id) as successfully_mapped,
  COUNT(DISTINCT CASE WHEN rim.id IS NULL THEN ri.ingredient_name END) as still_unmapped,
  ROUND(COUNT(DISTINCT rim.id) * 100.0 / NULLIF(COUNT(DISTINCT ri.ingredient_name), 0), 1) as mapping_percentage
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
LEFT JOIN recipe_ingredient_mappings rim ON r.id = rim.recipe_id 
  AND rim.ingredient_name = ri.ingredient_name
WHERE rt.name IN ('Croffle Overload', 'Mini Croffle')
  AND r.is_active = true;