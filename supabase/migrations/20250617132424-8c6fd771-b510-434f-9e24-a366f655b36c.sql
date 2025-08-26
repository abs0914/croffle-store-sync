
-- Create the recipe-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true);

-- Create policy to allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload recipe images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');

-- Create policy to allow public read access to recipe images
CREATE POLICY "Allow public read access to recipe images"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

-- Create policy to allow users to update their uploaded images
CREATE POLICY "Allow authenticated users to update recipe images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');

-- Create policy to allow users to delete recipe images
CREATE POLICY "Allow authenticated users to delete recipe images"
ON storage.objects FOR DELETE
USING (bucket_id = 'recipe-images' AND auth.role() = 'authenticated');
