-- Update product_catalog entries to link recipes directly (no triggers to worry about)

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Biscoff Biscuit' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Biscoff Biscuit' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Caramel Latte (Hot)' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Caramel Latte (Hot)' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Caramel Latte (Iced)' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Caramel Latte (Iced)' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Caramel Sauce' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Caramel Sauce' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Chocolate Crumbs' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Chocolate Crumbs' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Cookies & Cream Croffle' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Cookies & Cream Croffle' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Graham Crushed' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Graham Crushed' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Iced Tea' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Iced Tea' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Lemonade' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Lemonade' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Matcha Blended' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Matcha Blended' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Oreo Strawberry' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Oreo Strawberry' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Strawberry Kiss' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Strawberry Kiss' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Strawberry Latte' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Strawberry Latte' 
  AND recipe_id IS NULL;

UPDATE product_catalog 
SET recipe_id = (SELECT id FROM recipes WHERE name = 'Vanilla Caramel' AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'), 
    updated_at = NOW()
WHERE store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
  AND product_name = 'Vanilla Caramel' 
  AND recipe_id IS NULL;