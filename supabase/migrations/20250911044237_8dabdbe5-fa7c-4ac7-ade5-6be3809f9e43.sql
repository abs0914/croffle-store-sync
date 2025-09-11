-- Phase 1: Data Fixes for Mix & Match Products
-- Ensure all Mix & Match products have proper recipe links and base templates

-- 1. Create base recipe templates if they don't exist
INSERT INTO recipe_templates (id, name, description, category_name, is_active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'Mini Croffle Base', 'Base recipe for Mini Croffle products', 'Mini Croffle', true, now(), now()),
  (gen_random_uuid(), 'Croffle Overload Base', 'Base recipe for Croffle Overload products', 'Croffle Overload', true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- 2. Add base ingredients for Mini Croffle Base if not exists
INSERT INTO recipe_template_ingredients (id, recipe_template_id, ingredient_name, quantity, unit, cost_per_unit, ingredient_category, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  rt.id,
  'Regular Croissant',
  1,
  'pieces',
  15.00,
  'base_ingredient',
  now(),
  now()
FROM recipe_templates rt 
WHERE rt.name = 'Mini Croffle Base'
AND NOT EXISTS (
  SELECT 1 FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = 'Regular Croissant'
);

INSERT INTO recipe_template_ingredients (id, recipe_template_id, ingredient_name, quantity, unit, cost_per_unit, ingredient_category, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  rt.id,
  'Whipped Cream',
  0.5,
  'pieces',
  8.00,
  'classic_topping',
  now(),
  now()
FROM recipe_templates rt 
WHERE rt.name = 'Mini Croffle Base'
AND NOT EXISTS (
  SELECT 1 FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = 'Whipped Cream'
);

-- 3. Add base ingredients for Croffle Overload Base if not exists
INSERT INTO recipe_template_ingredients (id, recipe_template_id, ingredient_name, quantity, unit, cost_per_unit, ingredient_category, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  rt.id,
  'Regular Croissant',
  2,
  'pieces',
  15.00,
  'base_ingredient',
  now(),
  now()
FROM recipe_templates rt 
WHERE rt.name = 'Croffle Overload Base'
AND NOT EXISTS (
  SELECT 1 FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = 'Regular Croissant'
);

INSERT INTO recipe_template_ingredients (id, recipe_template_id, ingredient_name, quantity, unit, cost_per_unit, ingredient_category, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  rt.id,
  'Whipped Cream',
  1,
  'pieces',
  8.00,
  'classic_topping',
  now(),
  now()
FROM recipe_templates rt 
WHERE rt.name = 'Croffle Overload Base'
AND NOT EXISTS (
  SELECT 1 FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = 'Whipped Cream'
);

INSERT INTO recipe_template_ingredients (id, recipe_template_id, ingredient_name, quantity, unit, cost_per_unit, ingredient_category, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  rt.id,
  'Choco Flakes',
  1,
  'pieces',
  5.00,
  'classic_topping',
  now(),
  now()
FROM recipe_templates rt 
WHERE rt.name = 'Croffle Overload Base'
AND NOT EXISTS (
  SELECT 1 FROM recipe_template_ingredients rti 
  WHERE rti.recipe_template_id = rt.id AND rti.ingredient_name = 'Choco Flakes'
);

-- 4. Link existing recipes to base templates where missing template_id
UPDATE recipes 
SET template_id = (
  SELECT rt.id FROM recipe_templates rt 
  WHERE rt.name = 'Mini Croffle Base' 
  LIMIT 1
),
updated_at = now()
WHERE name = 'Mini Croffle' 
AND template_id IS NULL;

UPDATE recipes 
SET template_id = (
  SELECT rt.id FROM recipe_templates rt 
  WHERE rt.name = 'Croffle Overload Base' 
  LIMIT 1
),
updated_at = now()
WHERE name = 'Croffle Overload' 
AND template_id IS NULL;

-- 5. Add product_type classification to product_catalog for Mix & Match identification
ALTER TABLE product_catalog ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'regular';

-- 6. Mark Mix & Match products
UPDATE product_catalog 
SET product_type = 'mix_match',
    updated_at = now()
WHERE product_name ILIKE '%mini croffle%' 
   OR product_name ILIKE '%croffle overload%';

-- 7. Create index for faster Mix & Match queries
CREATE INDEX IF NOT EXISTS idx_product_catalog_product_type ON product_catalog(product_type) WHERE product_type = 'mix_match';