-- CRITICAL FIXES FOR FRUITY RECIPE TEMPLATES (CORRECTED)
-- Fix Missing Rectangle Ingredient, Zero Costs, and Unit Mismatches

-- 1. Add missing Rectangle ingredient to all three fruity recipe templates
INSERT INTO recipe_template_ingredients (
  recipe_template_id, 
  ingredient_name, 
  quantity, 
  unit, 
  cost_per_unit
)
SELECT 
  rt.id,
  'Rectangle' as ingredient_name,
  1 as quantity,
  'pieces' as unit,
  6.00 as cost_per_unit
FROM recipe_templates rt
WHERE rt.name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND rt.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_template_ingredients rti 
    WHERE rti.recipe_template_id = rt.id 
    AND LOWER(TRIM(rti.ingredient_name)) = 'rectangle'
  );

-- 2. Update all zero costs to match specifications
-- Regular Croissant: ₱30.00
UPDATE recipe_template_ingredients 
SET cost_per_unit = 30.00
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'regular croissant'
AND cost_per_unit = 0;

-- Whipped Cream: ₱8.00 and fix quantity/unit
UPDATE recipe_template_ingredients 
SET cost_per_unit = 8.00, 
    quantity = 1, 
    unit = 'pieces'
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'whipped cream';

-- Strawberry Jam: ₱12.00
UPDATE recipe_template_ingredients 
SET cost_per_unit = 12.00, 
    unit = 'g'
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name = 'Fruity - Strawberry'
  AND is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'strawberry jam';

-- Mango Jam: ₱12.00
UPDATE recipe_template_ingredients 
SET cost_per_unit = 12.00, 
    unit = 'g'
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name = 'Fruity - Mango'
  AND is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'mango jam';

-- Blueberry Jam: ₱12.00
UPDATE recipe_template_ingredients 
SET cost_per_unit = 12.00, 
    unit = 'g'
WHERE recipe_template_id IN (
  SELECT id FROM recipe_templates 
  WHERE name = 'Fruity - Blueberry'
  AND is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'blueberry jam';

-- 3. Update inventory stock costs for jam ingredients
UPDATE inventory_stock 
SET cost = 12.00, updated_at = NOW()
WHERE item IN ('Strawberry Jam', 'Mango Jam', 'Blueberry Jam')
AND (cost = 0 OR cost IS NULL);

-- Ensure Rectangle exists in inventory stock for all stores
INSERT INTO inventory_stock (
  store_id,
  item,
  item_category,
  unit,
  stock_quantity,
  minimum_threshold,
  cost,
  is_active,
  recipe_compatible
)
SELECT DISTINCT
  s.id as store_id,
  'Rectangle' as item,
  'packaging'::inventory_item_category,
  'pieces' as unit,
  0 as stock_quantity,
  10 as minimum_threshold,
  6.00 as cost,
  true as is_active,
  true as recipe_compatible
FROM stores s
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM inventory_stock ist 
  WHERE ist.store_id = s.id 
  AND ist.item = 'Rectangle'
);

-- 4. Recalculate recipe template suggested prices based on new costs
-- Strawberry: 30 + 8 + 12 + 6 = 56, suggested price with 150% markup = 140
UPDATE recipe_templates 
SET suggested_price = 140.00, updated_at = NOW()
WHERE name = 'Fruity - Strawberry' AND is_active = true;

-- Mango: 30 + 8 + 12 + 6 = 56, suggested price with 150% markup = 140  
UPDATE recipe_templates 
SET suggested_price = 140.00, updated_at = NOW()
WHERE name = 'Fruity - Mango' AND is_active = true;

-- Blueberry: 30 + 8 + 12 + 6 = 56, suggested price with 150% markup = 140
UPDATE recipe_templates 
SET suggested_price = 140.00, updated_at = NOW()
WHERE name = 'Fruity - Blueberry' AND is_active = true;

-- 5. Update existing recipes that were deployed from these templates
-- Add missing Rectangle ingredient to existing recipes
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit
)
SELECT 
  r.id,
  'Rectangle' as ingredient_name,
  1 as quantity,
  'pieces'::inventory_unit,
  6.00 as cost_per_unit
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE rt.name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND rt.is_active = true
  AND r.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND LOWER(TRIM(ri.ingredient_name)) = 'rectangle'
  );

-- Update costs in existing recipe ingredients
UPDATE recipe_ingredients 
SET cost_per_unit = 30.00, updated_at = NOW()
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND rt.is_active = true AND r.is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'regular croissant'
AND cost_per_unit = 0;

-- Fix Whipped Cream in existing recipes
UPDATE recipe_ingredients 
SET cost_per_unit = 8.00, 
    quantity = 1, 
    unit = 'pieces'::inventory_unit,
    updated_at = NOW()
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND rt.is_active = true AND r.is_active = true
)
AND LOWER(TRIM(ingredient_name)) = 'whipped cream';

-- Update jam costs in existing recipes
UPDATE recipe_ingredients 
SET cost_per_unit = 12.00, unit = 'g'::inventory_unit, updated_at = NOW()
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND rt.is_active = true AND r.is_active = true
)
AND LOWER(TRIM(ingredient_name)) IN ('strawberry jam', 'mango jam', 'blueberry jam');

-- 6. Recalculate total costs for all affected recipes
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
  WHERE rt.name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND rt.is_active = true AND r.is_active = true
);

-- 7. Update product catalog pricing for fruity products
UPDATE product_catalog 
SET price = 140.00, updated_at = NOW()
WHERE recipe_id IN (
  SELECT r.id FROM recipes r
  JOIN recipe_templates rt ON r.template_id = rt.id
  WHERE rt.name IN ('Fruity - Strawberry', 'Fruity - Mango', 'Fruity - Blueberry')
  AND rt.is_active = true AND r.is_active = true
)
AND is_available = true;