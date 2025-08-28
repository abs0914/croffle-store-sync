-- Link existing storage images to products
-- This updates product catalog entries with their corresponding storage image URLs

UPDATE product_catalog 
SET 
  image_url = 'https://bwmkqscqkfoezcuzgpwq.supabase.co/storage/v1/object/public/product-images/' || so.name,
  updated_at = NOW()
FROM storage.objects so
WHERE so.bucket_id = 'product-images'
  AND product_catalog.image_url IS NULL
  AND product_catalog.store_id = 'e78ad702-1135-482d-a508-88104e2706cf'
  -- Match products to images (you can customize this matching logic)
  AND so.name LIKE 'products/%';

-- Ensure storage buckets have proper public access
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('product-images', 'recipe-images');

-- Create RLS policy for public read access to product images
CREATE POLICY "Public read access for product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

-- Create RLS policy for authenticated users to upload product images
CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);