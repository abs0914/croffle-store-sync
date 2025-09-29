-- Fix Mini Croffle ingredient portions and remove duplicates

-- Step 1: Remove duplicate recipe ingredients for Mini Croffle recipes
WITH duplicate_ingredients AS (
  SELECT 
    ri.id,
    ROW_NUMBER() OVER (
      PARTITION BY ri.recipe_id, LOWER(TRIM(ri.ingredient_name)) 
      ORDER BY ri.created_at DESC
    ) as row_num
  FROM recipe_ingredients ri
  JOIN recipes r ON ri.recipe_id = r.id
  WHERE LOWER(r.name) LIKE '%mini croffle%'
    AND r.is_active = true
)
DELETE FROM recipe_ingredients 
WHERE id IN (
  SELECT id FROM duplicate_ingredients WHERE row_num > 1
);

-- Step 2: Update Mini Croffle choice ingredients to 0.5 portions
-- Choice ingredients are sauces and toppings (not base ingredients)
UPDATE recipe_ingredients
SET 
  quantity = 0.5,
  updated_at = NOW()
FROM recipes r
WHERE recipe_ingredients.recipe_id = r.id
  AND LOWER(r.name) LIKE '%mini croffle%'
  AND r.is_active = true
  AND (
    -- Sauce ingredients
    LOWER(recipe_ingredients.ingredient_name) LIKE '%sauce%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%syrup%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%chocolate%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%caramel%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%nutella%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%tiramisu%' OR
    -- Topping ingredients
    LOWER(recipe_ingredients.ingredient_name) LIKE '%peanut%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%marshmallow%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%choco flake%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%chocolate flake%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%sprinkle%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%oreo%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%graham%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%blueberry%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%strawberry%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%banana%'
  )
  -- Exclude base ingredients
  AND NOT (
    LOWER(recipe_ingredients.ingredient_name) LIKE '%croissant%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%whipped cream%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%popsicle stick%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%cup%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%wrapper%'
  );

-- Step 3: Verify base ingredients have correct portions
-- Regular Croissant and Whipped Cream should be 0.5, Popsicle Stick should be 1.0
UPDATE recipe_ingredients
SET 
  quantity = 0.5,
  updated_at = NOW()
FROM recipes r
WHERE recipe_ingredients.recipe_id = r.id
  AND LOWER(r.name) LIKE '%mini croffle%'
  AND r.is_active = true
  AND (
    LOWER(recipe_ingredients.ingredient_name) LIKE '%regular croissant%' OR
    LOWER(recipe_ingredients.ingredient_name) LIKE '%whipped cream%'
  )
  AND recipe_ingredients.quantity != 0.5;

UPDATE recipe_ingredients
SET 
  quantity = 1.0,
  updated_at = NOW()
FROM recipes r
WHERE recipe_ingredients.recipe_id = r.id
  AND LOWER(r.name) LIKE '%mini croffle%'
  AND r.is_active = true
  AND LOWER(recipe_ingredients.ingredient_name) LIKE '%popsicle stick%'
  AND recipe_ingredients.quantity != 1.0;

-- Step 4: Update recipe costs after portion adjustments
UPDATE recipes
SET 
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
WHERE LOWER(name) LIKE '%mini croffle%'
  AND is_active = true;