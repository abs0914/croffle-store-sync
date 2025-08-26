-- Fix KitKat and Nutella pricing conflicts
-- Rename individual KitKat and Nutella products in Premium category to avoid confusion with add-ons

-- First, update KitKat products in Premium category that are incorrectly priced at ₱10
UPDATE product_catalog 
SET 
  product_name = 'KitKat Special',
  price = 85.00,
  description = 'Delicious KitKat special drink'
WHERE product_name = 'KitKat' 
  AND price = 10.00 
  AND category_id IN (
    SELECT id FROM categories WHERE name = 'Premium'
  );

-- Update Nutella products in Premium category that are incorrectly priced at ₱10
UPDATE product_catalog 
SET 
  product_name = 'Nutella Special',
  price = 85.00,
  description = 'Rich Nutella special drink'
WHERE product_name = 'Nutella' 
  AND price = 10.00 
  AND category_id IN (
    SELECT id FROM categories WHERE name = 'Premium'
  );

-- Verify the changes by showing the updated structure
-- Add-ons (₱10): "KitKat" and "Nutella" in Add-on category
-- Premium Croffles (₱125): "KitKat Croffle" and "Nutella Croffle" in Premium category  
-- Individual Products (₱85): "KitKat Special" and "Nutella Special" in Premium category