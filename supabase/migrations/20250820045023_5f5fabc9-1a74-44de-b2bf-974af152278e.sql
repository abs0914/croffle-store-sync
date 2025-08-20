-- Phase 1: Create missing beverage recipes with proper ingredient mapping

-- First, let's create recipes for the missing beverages
-- CARAMEL LATTE (we'll create for the existing product)
INSERT INTO recipes (
  name, description, instructions, yield_quantity, serving_size, 
  store_id, is_active, created_at, updated_at
)
SELECT 
  'Caramel Latte Recipe',
  'Hot caramel latte with espresso and steamed milk',
  'Add caramel sauce to cup. Brew espresso shot. Steam milk. Combine and serve.',
  1,
  1,
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
LIMIT 1;

-- Get the recipe ID for ingredients
DO $$
DECLARE
  caramel_latte_recipe_id UUID;
  store_id_var UUID;
BEGIN
  -- Get a store ID
  SELECT id INTO store_id_var FROM stores WHERE is_active = true LIMIT 1;
  
  -- Get the caramel latte recipe ID
  SELECT id INTO caramel_latte_recipe_id 
  FROM recipes 
  WHERE name = 'Caramel Latte Recipe' 
  LIMIT 1;

  -- Add ingredients for Caramel Latte
  INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
  SELECT 
    caramel_latte_recipe_id,
    ist.id,
    CASE 
      WHEN ist.item ILIKE '%coffee%' OR ist.item ILIKE '%espresso%' THEN 30
      WHEN ist.item ILIKE '%milk%' THEN 150
      WHEN ist.item ILIKE '%caramel%' THEN 15
      WHEN ist.item ILIKE '%ice%' THEN 100
    END,
    CASE 
      WHEN ist.item ILIKE '%coffee%' OR ist.item ILIKE '%espresso%' THEN 'ml'
      WHEN ist.item ILIKE '%milk%' THEN 'ml'
      WHEN ist.item ILIKE '%caramel%' THEN 'ml'
      WHEN ist.item ILIKE '%ice%' THEN 'grams'
    END,
    NOW()
  FROM inventory_stock ist
  WHERE ist.store_id = store_id_var
  AND ist.is_active = true
  AND (
    ist.item ILIKE '%coffee%' OR ist.item ILIKE '%espresso%' OR
    ist.item ILIKE '%milk%' OR
    ist.item ILIKE '%caramel%' OR
    ist.item ILIKE '%ice%'
  )
  AND ist.item NOT ILIKE '%powder%'
  LIMIT 4;
END $$;

-- STRAWBERRY LATTE Recipe
INSERT INTO recipes (
  name, description, instructions, yield_quantity, serving_size, 
  store_id, is_active, created_at, updated_at
)
SELECT 
  'Strawberry Latte Recipe',
  'Refreshing iced strawberry latte',
  'Add strawberry syrup to cup. Add ice. Pour cold milk. Stir and serve.',
  1,
  1,
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
LIMIT 1;

-- MATCHA BLENDED Recipe
INSERT INTO recipes (
  name, description, instructions, yield_quantity, serving_size, 
  store_id, is_active, created_at, updated_at
)
SELECT 
  'Matcha Blended Recipe',
  'Creamy matcha frappe blend',
  'Blend matcha powder with frappe powder, milk and ice until smooth.',
  1,
  1,
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
LIMIT 1;

-- STRAWBERRY KISS Recipe
INSERT INTO recipes (
  name, description, instructions, yield_quantity, serving_size, 
  store_id, is_active, created_at, updated_at
)
SELECT 
  'Strawberry Kiss Recipe',
  'Strawberry frappe with chocolate chips',
  'Blend strawberry syrup with frappe powder and milk. Add ice and chocolate chips.',
  1,
  1,
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
LIMIT 1;

-- OREO STRAWBERRY Recipe
INSERT INTO recipes (
  name, description, instructions, yield_quantity, serving_size, 
  store_id, is_active, created_at, updated_at
)
SELECT 
  'Oreo Strawberry Recipe',
  'Strawberry frappe with crushed oreo',
  'Blend frappe powder with strawberry syrup and milk. Add ice and crushed oreo.',
  1,
  1,
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
LIMIT 1;

-- ICED TEA Recipe
INSERT INTO recipes (
  name, description, instructions, yield_quantity, serving_size, 
  store_id, is_active, created_at, updated_at
)
SELECT 
  'Iced Tea Recipe',
  'Refreshing iced tea drink',
  'Mix ice tea powder with cold water. Add ice and serve.',
  1,
  1,
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
LIMIT 1;

-- LEMONADE Recipe
INSERT INTO recipes (
  name, description, instructions, yield_quantity, serving_size, 
  store_id, is_active, created_at, updated_at
)
SELECT 
  'Lemonade Recipe',
  'Fresh lemonade drink',
  'Mix lemonade powder with cold water. Add ice and serve.',
  1,
  1,
  s.id,
  true,
  NOW(),
  NOW()
FROM stores s
WHERE s.is_active = true
LIMIT 1;

-- Now add ingredients for all the new recipes
DO $$
DECLARE
  recipe_record RECORD;
  store_id_var UUID;
BEGIN
  -- Get a store ID
  SELECT id INTO store_id_var FROM stores WHERE is_active = true LIMIT 1;
  
  -- Add ingredients for Strawberry Latte
  FOR recipe_record IN 
    SELECT id FROM recipes WHERE name = 'Strawberry Latte Recipe'
  LOOP
    INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
    SELECT 
      recipe_record.id,
      ist.id,
      CASE 
        WHEN ist.item ILIKE '%strawberry%' THEN 20
        WHEN ist.item ILIKE '%milk%' THEN 150
        WHEN ist.item ILIKE '%ice%' THEN 100
      END,
      CASE 
        WHEN ist.item ILIKE '%strawberry%' OR ist.item ILIKE '%milk%' THEN 'ml'
        WHEN ist.item ILIKE '%ice%' THEN 'grams'
      END,
      NOW()
    FROM inventory_stock ist
    WHERE ist.store_id = store_id_var
    AND ist.is_active = true
    AND (
      ist.item ILIKE '%strawberry%' OR
      ist.item ILIKE '%milk%' OR
      ist.item ILIKE '%ice%'
    )
    LIMIT 3;
  END LOOP;

  -- Add ingredients for Matcha Blended
  FOR recipe_record IN 
    SELECT id FROM recipes WHERE name = 'Matcha Blended Recipe'
  LOOP
    INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
    SELECT 
      recipe_record.id,
      ist.id,
      CASE 
        WHEN ist.item ILIKE '%matcha%' THEN 10
        WHEN ist.item ILIKE '%frappe%' THEN 25
        WHEN ist.item ILIKE '%milk%' THEN 150
        WHEN ist.item ILIKE '%ice%' THEN 100
      END,
      CASE 
        WHEN ist.item ILIKE '%matcha%' OR ist.item ILIKE '%frappe%' THEN 'grams'
        WHEN ist.item ILIKE '%milk%' THEN 'ml'
        WHEN ist.item ILIKE '%ice%' THEN 'grams'
      END,
      NOW()
    FROM inventory_stock ist
    WHERE ist.store_id = store_id_var
    AND ist.is_active = true
    AND (
      ist.item ILIKE '%matcha%' OR
      ist.item ILIKE '%frappe%' OR
      ist.item ILIKE '%milk%' OR
      ist.item ILIKE '%ice%'
    )
    LIMIT 4;
  END LOOP;

  -- Add ingredients for Strawberry Kiss
  FOR recipe_record IN 
    SELECT id FROM recipes WHERE name = 'Strawberry Kiss Recipe'
  LOOP
    INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
    SELECT 
      recipe_record.id,
      ist.id,
      CASE 
        WHEN ist.item ILIKE '%strawberry%' THEN 20
        WHEN ist.item ILIKE '%frappe%' THEN 25
        WHEN ist.item ILIKE '%milk%' THEN 150
        WHEN ist.item ILIKE '%ice%' THEN 100
        WHEN ist.item ILIKE '%chocolate%' AND ist.item ILIKE '%chip%' THEN 15
      END,
      CASE 
        WHEN ist.item ILIKE '%strawberry%' OR ist.item ILIKE '%milk%' THEN 'ml'
        WHEN ist.item ILIKE '%frappe%' OR ist.item ILIKE '%ice%' OR ist.item ILIKE '%chocolate%' THEN 'grams'
      END,
      NOW()
    FROM inventory_stock ist
    WHERE ist.store_id = store_id_var
    AND ist.is_active = true
    AND (
      ist.item ILIKE '%strawberry%' OR
      ist.item ILIKE '%frappe%' OR
      ist.item ILIKE '%milk%' OR
      ist.item ILIKE '%ice%' OR
      (ist.item ILIKE '%chocolate%' AND ist.item ILIKE '%chip%')
    )
    LIMIT 5;
  END LOOP;

  -- Add ingredients for Oreo Strawberry
  FOR recipe_record IN 
    SELECT id FROM recipes WHERE name = 'Oreo Strawberry Recipe'
  LOOP
    INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
    SELECT 
      recipe_record.id,
      ist.id,
      CASE 
        WHEN ist.item ILIKE '%frappe%' THEN 25
        WHEN ist.item ILIKE '%strawberry%' THEN 20
        WHEN ist.item ILIKE '%oreo%' THEN 20
        WHEN ist.item ILIKE '%milk%' THEN 150
        WHEN ist.item ILIKE '%ice%' THEN 100
      END,
      CASE 
        WHEN ist.item ILIKE '%strawberry%' OR ist.item ILIKE '%milk%' THEN 'ml'
        WHEN ist.item ILIKE '%frappe%' OR ist.item ILIKE '%oreo%' OR ist.item ILIKE '%ice%' THEN 'grams'
      END,
      NOW()
    FROM inventory_stock ist
    WHERE ist.store_id = store_id_var
    AND ist.is_active = true
    AND (
      ist.item ILIKE '%frappe%' OR
      ist.item ILIKE '%strawberry%' OR
      ist.item ILIKE '%oreo%' OR
      ist.item ILIKE '%milk%' OR
      ist.item ILIKE '%ice%'
    )
    LIMIT 5;
  END LOOP;

  -- Add ingredients for Iced Tea
  FOR recipe_record IN 
    SELECT id FROM recipes WHERE name = 'Iced Tea Recipe'
  LOOP
    INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
    SELECT 
      recipe_record.id,
      ist.id,
      CASE 
        WHEN ist.item ILIKE '%tea%' AND ist.item ILIKE '%powder%' THEN 15
        WHEN ist.item ILIKE '%water%' THEN 200
        WHEN ist.item ILIKE '%ice%' THEN 100
      END,
      CASE 
        WHEN ist.item ILIKE '%tea%' AND ist.item ILIKE '%powder%' THEN 'grams'
        WHEN ist.item ILIKE '%water%' THEN 'ml'
        WHEN ist.item ILIKE '%ice%' THEN 'grams'
      END,
      NOW()
    FROM inventory_stock ist
    WHERE ist.store_id = store_id_var
    AND ist.is_active = true
    AND (
      (ist.item ILIKE '%tea%' AND ist.item ILIKE '%powder%') OR
      ist.item ILIKE '%water%' OR
      ist.item ILIKE '%ice%'
    )
    LIMIT 3;
  END LOOP;

  -- Add ingredients for Lemonade
  FOR recipe_record IN 
    SELECT id FROM recipes WHERE name = 'Lemonade Recipe'
  LOOP
    INSERT INTO recipe_ingredients (recipe_id, inventory_stock_id, quantity, unit, created_at)
    SELECT 
      recipe_record.id,
      ist.id,
      CASE 
        WHEN ist.item ILIKE '%lemonade%' AND ist.item ILIKE '%powder%' THEN 20
        WHEN ist.item ILIKE '%water%' THEN 200
        WHEN ist.item ILIKE '%ice%' THEN 100
      END,
      CASE 
        WHEN ist.item ILIKE '%lemonade%' AND ist.item ILIKE '%powder%' THEN 'grams'
        WHEN ist.item ILIKE '%water%' THEN 'ml'
        WHEN ist.item ILIKE '%ice%' THEN 'grams'
      END,
      NOW()
    FROM inventory_stock ist
    WHERE ist.store_id = store_id_var
    AND ist.is_active = true
    AND (
      (ist.item ILIKE '%lemonade%' AND ist.item ILIKE '%powder%') OR
      ist.item ILIKE '%water%' OR
      ist.item ILIKE '%ice%'
    )
    LIMIT 3;
  END LOOP;
END $$;

-- Phase 2: Update missing costs for key inventory items
UPDATE inventory_stock 
SET cost = CASE 
  WHEN item ILIKE '%bottle%' AND item ILIKE '%water%' THEN 15.00
  WHEN item ILIKE '%caramel%' AND item ILIKE '%syrup%' THEN 120.00
  WHEN item ILIKE '%coke%' THEN 25.00
  WHEN item ILIKE '%creamer%' THEN 80.00
  WHEN item ILIKE '%strawberry%' AND item ILIKE '%syrup%' THEN 100.00
  WHEN item ILIKE '%chocolate%' AND item ILIKE '%syrup%' THEN 100.00
  WHEN item ILIKE '%vanilla%' AND item ILIKE '%syrup%' THEN 100.00
  WHEN item ILIKE '%frappe%' AND item ILIKE '%powder%' THEN 150.00
  WHEN item ILIKE '%matcha%' AND item ILIKE '%powder%' THEN 200.00
  WHEN item ILIKE '%lemonade%' AND item ILIKE '%powder%' THEN 80.00
  WHEN item ILIKE '%tea%' AND item ILIKE '%powder%' THEN 90.00
  WHEN item ILIKE '%oreo%' THEN 50.00
  WHEN item ILIKE '%chocolate%' AND item ILIKE '%chip%' THEN 120.00
  WHEN item ILIKE '%milk%' THEN 60.00
  WHEN item ILIKE '%ice%' THEN 5.00
  WHEN item ILIKE '%water%' THEN 3.00
  ELSE cost
END,
updated_at = NOW()
WHERE cost = 0 OR cost IS NULL;

-- Phase 3: Assign categories to uncategorized products
-- Get beverage category ID
DO $$
DECLARE
  beverage_category_id UUID;
  addon_category_id UUID;
BEGIN
  -- Get or create Beverages category
  SELECT id INTO beverage_category_id 
  FROM categories 
  WHERE name ILIKE '%beverage%' 
  LIMIT 1;
  
  IF beverage_category_id IS NULL THEN
    INSERT INTO categories (name, description, store_id, is_active, created_at, updated_at)
    SELECT 'Beverages', 'All beverage products', id, true, NOW(), NOW()
    FROM stores WHERE is_active = true LIMIT 1
    RETURNING id INTO beverage_category_id;
  END IF;

  -- Get or create Add-ons category
  SELECT id INTO addon_category_id 
  FROM categories 
  WHERE name ILIKE '%add%' OR name ILIKE '%topping%'
  LIMIT 1;
  
  IF addon_category_id IS NULL THEN
    INSERT INTO categories (name, description, store_id, is_active, created_at, updated_at)
    SELECT 'Add-ons', 'Product add-ons and toppings', id, true, NOW(), NOW()
    FROM stores WHERE is_active = true LIMIT 1
    RETURNING id INTO addon_category_id;
  END IF;

  -- Update uncategorized beverage products
  UPDATE products 
  SET category_id = beverage_category_id,
      updated_at = NOW()
  WHERE category_id IS NULL
  AND (
    name ILIKE '%latte%' OR name ILIKE '%cappucino%' OR name ILIKE '%americano%' OR
    name ILIKE '%tea%' OR name ILIKE '%lemonade%' OR name ILIKE '%matcha%' OR
    name ILIKE '%strawberry kiss%' OR name ILIKE '%oreo strawberry%' OR
    name ILIKE '%coffee%' OR name ILIKE '%espresso%' OR name ILIKE '%frappe%'
  );

  -- Update uncategorized add-on products
  UPDATE products 
  SET category_id = addon_category_id,
      updated_at = NOW()
  WHERE category_id IS NULL
  AND (
    name ILIKE '%biscoff%' OR name ILIKE '%caramel%' OR name ILIKE '%chocolate%' OR
    name ILIKE '%syrup%' OR name ILIKE '%sauce%' OR name ILIKE '%powder%' OR
    name ILIKE '%crushed%' OR name ILIKE '%graham%'
  );
END $$;

-- Phase 4: Link products to their new recipes
DO $$
DECLARE
  product_record RECORD;
  recipe_id_var UUID;
BEGIN
  -- Link Caramel Latte products to recipe
  SELECT id INTO recipe_id_var FROM recipes WHERE name = 'Caramel Latte Recipe' LIMIT 1;
  UPDATE products 
  SET recipe_id = recipe_id_var, updated_at = NOW()
  WHERE name ILIKE '%caramel%' AND name ILIKE '%latte%' AND recipe_id IS NULL;

  -- Link Strawberry Latte products to recipe
  SELECT id INTO recipe_id_var FROM recipes WHERE name = 'Strawberry Latte Recipe' LIMIT 1;
  UPDATE products 
  SET recipe_id = recipe_id_var, updated_at = NOW()
  WHERE name ILIKE '%strawberry%' AND name ILIKE '%latte%' AND recipe_id IS NULL;

  -- Link Matcha Blended products to recipe
  SELECT id INTO recipe_id_var FROM recipes WHERE name = 'Matcha Blended Recipe' LIMIT 1;
  UPDATE products 
  SET recipe_id = recipe_id_var, updated_at = NOW()
  WHERE name ILIKE '%matcha%' AND name ILIKE '%blended%' AND recipe_id IS NULL;

  -- Link Strawberry Kiss products to recipe
  SELECT id INTO recipe_id_var FROM recipes WHERE name = 'Strawberry Kiss Recipe' LIMIT 1;
  UPDATE products 
  SET recipe_id = recipe_id_var, updated_at = NOW()
  WHERE name ILIKE '%strawberry%' AND name ILIKE '%kiss%' AND recipe_id IS NULL;

  -- Link Oreo Strawberry products to recipe
  SELECT id INTO recipe_id_var FROM recipes WHERE name = 'Oreo Strawberry Recipe' LIMIT 1;
  UPDATE products 
  SET recipe_id = recipe_id_var, updated_at = NOW()
  WHERE name ILIKE '%oreo%' AND name ILIKE '%strawberry%' AND recipe_id IS NULL;

  -- Link Iced Tea products to recipe
  SELECT id INTO recipe_id_var FROM recipes WHERE name = 'Iced Tea Recipe' LIMIT 1;
  UPDATE products 
  SET recipe_id = recipe_id_var, updated_at = NOW()
  WHERE name ILIKE '%iced%' AND name ILIKE '%tea%' AND recipe_id IS NULL;

  -- Link Lemonade products to recipe
  SELECT id INTO recipe_id_var FROM recipes WHERE name = 'Lemonade Recipe' LIMIT 1;
  UPDATE products 
  SET recipe_id = recipe_id_var, updated_at = NOW()
  WHERE name ILIKE '%lemonade%' AND recipe_id IS NULL;
END $$;