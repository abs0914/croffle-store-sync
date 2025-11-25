-- Delete duplicate recipe templates and ALL their deployed recipes
-- This will remove these recipes from all stores

-- Step 1: Delete recipe ingredients for deployed recipes
DELETE FROM recipe_ingredients
WHERE recipe_id IN (
  SELECT id FROM recipes 
  WHERE template_id IN (
    'ffc740b7-c8a4-4862-b892-0e2d213b77a5', -- Croffle Overload Base
    '86b74b1b-59db-4cad-8168-fa4c5220c977', -- Mini Croffle Base
    '9526f4e6-fab4-4b77-a7e6-cd3378f04230', -- Premium - Biscoff
    '9e7f5cbc-caa8-4bb6-91a4-31d09786ac99', -- Premium - Choco Overload
    'd3c70bb4-f3f6-4b8e-8d31-b73585d76958', -- Premium - Cookies & Cream
    'f1fdf211-8fb3-45c2-a1b2-fedb4e99a1f6', -- Premium - Dark Chocolate
    '3b458679-d8fd-4d97-8f22-c35be370746c', -- Premium - Kitkat
    '16678cf7-ef54-49d9-a8f4-245cbeb2384f', -- Premium - Matcha
    'd6530962-109e-4e3f-9dee-c5d52ce37ffe'  -- Premium - Nutella
  )
);

-- Step 2: Delete deployed recipes from stores
DELETE FROM recipes
WHERE template_id IN (
  'ffc740b7-c8a4-4862-b892-0e2d213b77a5', -- Croffle Overload Base
  '86b74b1b-59db-4cad-8168-fa4c5220c977', -- Mini Croffle Base
  '9526f4e6-fab4-4b77-a7e6-cd3378f04230', -- Premium - Biscoff
  '9e7f5cbc-caa8-4bb6-91a4-31d09786ac99', -- Premium - Choco Overload
  'd3c70bb4-f3f6-4b8e-8d31-b73585d76958', -- Premium - Cookies & Cream
  'f1fdf211-8fb3-45c2-a1b2-fedb4e99a1f6', -- Premium - Dark Chocolate
  '3b458679-d8fd-4d97-8f22-c35be370746c', -- Premium - Kitkat
  '16678cf7-ef54-49d9-a8f4-245cbeb2384f', -- Premium - Matcha
  'd6530962-109e-4e3f-9dee-c5d52ce37ffe'  -- Premium - Nutella
);

-- Step 3: Delete recipe template ingredients
DELETE FROM recipe_template_ingredients
WHERE recipe_template_id IN (
  'ffc740b7-c8a4-4862-b892-0e2d213b77a5', -- Croffle Overload Base
  '86b74b1b-59db-4cad-8168-fa4c5220c977', -- Mini Croffle Base
  '9526f4e6-fab4-4b77-a7e6-cd3378f04230', -- Premium - Biscoff
  '9e7f5cbc-caa8-4bb6-91a4-31d09786ac99', -- Premium - Choco Overload
  'd3c70bb4-f3f6-4b8e-8d31-b73585d76958', -- Premium - Cookies & Cream
  'f1fdf211-8fb3-45c2-a1b2-fedb4e99a1f6', -- Premium - Dark Chocolate
  '3b458679-d8fd-4d97-8f22-c35be370746c', -- Premium - Kitkat
  '16678cf7-ef54-49d9-a8f4-245cbeb2384f', -- Premium - Matcha
  'd6530962-109e-4e3f-9dee-c5d52ce37ffe'  -- Premium - Nutella
);

-- Step 4: Delete the recipe templates
DELETE FROM recipe_templates
WHERE id IN (
  'ffc740b7-c8a4-4862-b892-0e2d213b77a5', -- Croffle Overload Base
  '86b74b1b-59db-4cad-8168-fa4c5220c977', -- Mini Croffle Base
  '9526f4e6-fab4-4b77-a7e6-cd3378f04230', -- Premium - Biscoff
  '9e7f5cbc-caa8-4bb6-91a4-31d09786ac99', -- Premium - Choco Overload
  'd3c70bb4-f3f6-4b8e-8d31-b73585d76958', -- Premium - Cookies & Cream
  'f1fdf211-8fb3-45c2-a1b2-fedb4e99a1f6', -- Premium - Dark Chocolate
  '3b458679-d8fd-4d97-8f22-c35be370746c', -- Premium - Kitkat
  '16678cf7-ef54-49d9-a8f4-245cbeb2384f', -- Premium - Matcha
  'd6530962-109e-4e3f-9dee-c5d52ce37ffe'  -- Premium - Nutella
);