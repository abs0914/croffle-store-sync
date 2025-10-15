-- Upload KitKat image URL to all KitKat Biscuit products that don't have an image
-- This is a one-time update to add the uploaded image
UPDATE product_catalog
SET image_url = 'https://bwmkqscqkfoezcuzgpwq.supabase.co/storage/v1/object/public/product-images/products/kitkat-biscuit.jpg',
    updated_at = NOW()
WHERE product_name = 'KitKat Biscuit'
  AND (image_url IS NULL OR image_url = '');