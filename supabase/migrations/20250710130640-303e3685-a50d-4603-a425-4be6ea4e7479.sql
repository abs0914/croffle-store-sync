-- Ensure recipe-images bucket has proper policies for public access
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploaded recipe images" ON storage.objects;

-- Create comprehensive storage policies for recipe-images bucket
CREATE POLICY "Anyone can view recipe images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'recipe-images');

CREATE POLICY "Authenticated users can upload recipe images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update recipe images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete recipe images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'recipe-images' 
  AND auth.role() = 'authenticated'
);