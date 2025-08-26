
-- Add image_url column to product_catalog table if it doesn't exist
ALTER TABLE product_catalog 
ADD COLUMN IF NOT EXISTS image_url TEXT;
