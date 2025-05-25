-- Update products with sample images for Robinsons North store
-- First, let's see what products exist
SELECT p.id, p.name, p.image_url, s.name as store_name 
FROM products p 
JOIN stores s ON p.store_id = s.id 
WHERE s.name = 'Robinsons North'
ORDER BY p.name;

-- Update products with sample croffle images
UPDATE products 
SET image_url = CASE 
  WHEN name ILIKE '%biscoff%' THEN 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop'
  WHEN name ILIKE '%blueberry%' THEN 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop'
  WHEN name ILIKE '%caramel%' THEN 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400&fit=crop'
  WHEN name ILIKE '%choco%' OR name ILIKE '%chocolate%' THEN 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop'
  WHEN name ILIKE '%nut%' THEN 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop'
  WHEN name ILIKE '%cookies%' THEN 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=400&fit=crop'
  WHEN name ILIKE '%croffle%' THEN 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop'
  WHEN name ILIKE '%dark%' THEN 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop'
  WHEN name ILIKE '%kitkat%' THEN 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop'
  ELSE 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop'
END
WHERE store_id IN (SELECT id FROM stores WHERE name = 'Robinsons North')
AND (image_url IS NULL OR image_url = '');

-- Verify the update
SELECT p.id, p.name, p.image_url, s.name as store_name 
FROM products p 
JOIN stores s ON p.store_id = s.id 
WHERE s.name = 'Robinsons North'
AND p.image_url IS NOT NULL
ORDER BY p.name;
