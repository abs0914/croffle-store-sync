-- Phase 1: Move KitKat Biscuit products from Add-ons to Add-on category in PRODUCTS table
UPDATE products p
SET category_id = (
  SELECT c2.id FROM categories c2 
  WHERE c2.name = 'Add-on' 
    AND c2.store_id = p.store_id
  LIMIT 1
)
FROM categories c
WHERE p.category_id = c.id 
  AND c.name = 'Add-ons'
  AND EXISTS (
    SELECT 1 FROM categories c2 
    WHERE c2.name = 'Add-on' 
      AND c2.store_id = p.store_id
  );

-- Phase 1b: Move KitKat Biscuit products from Add-ons to Add-on category in PRODUCT_CATALOG table
UPDATE product_catalog pc
SET category_id = (
  SELECT c2.id FROM categories c2 
  WHERE c2.name = 'Add-on' 
    AND c2.store_id = pc.store_id
  LIMIT 1
)
FROM categories c
WHERE pc.category_id = c.id 
  AND c.name = 'Add-ons'
  AND EXISTS (
    SELECT 1 FROM categories c2 
    WHERE c2.name = 'Add-on' 
      AND c2.store_id = pc.store_id
  );

-- Phase 2: Delete Mini Croffle Base from products table
DELETE FROM products 
WHERE name = 'Mini Croffle Base';

-- Phase 2b: Delete Mini Croffle Base from product_catalog table
DELETE FROM product_catalog 
WHERE product_name = 'Mini Croffle Base';

-- Phase 3: Delete unused categories (now safe after moving/deleting products)
DELETE FROM categories 
WHERE name IN ('Add-ons', 'addon', 'Mini Croffle', 'Desserts', 'Other');

-- Phase 4: Sync images from Sugbo Mercado to all stores with NULL images
-- Only update if source image exists
UPDATE product_catalog pc_target
SET image_url = pc_source.image_url
FROM product_catalog pc_source
WHERE pc_source.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND pc_source.product_name = pc_target.product_name
  AND pc_source.image_url IS NOT NULL
  AND pc_target.image_url IS NULL
  AND pc_target.store_id != 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

-- Phase 5: Fix zero/abnormal prices across all stores
-- Only update if source price exists and is valid
UPDATE product_catalog pc_target
SET price = pc_source.price
FROM product_catalog pc_source
WHERE pc_source.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND pc_source.product_name = pc_target.product_name
  AND pc_source.price > 0
  AND (pc_target.price = 0 OR pc_target.price > 200)
  AND pc_target.store_id != 'd7c47e6b-f20a-4543-a6bd-000398f72df5';