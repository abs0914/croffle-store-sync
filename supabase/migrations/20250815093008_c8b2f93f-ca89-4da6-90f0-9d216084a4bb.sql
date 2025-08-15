-- Remove the unavailable "Caramel" product that's causing validation issues
-- This product is marked as unavailable but still causing validation problems

DELETE FROM product_ingredients 
WHERE product_catalog_id = 'ecdedbf6-f881-4323-8bfc-63c8b2c8a351';

DELETE FROM product_catalog 
WHERE id = 'ecdedbf6-f881-4323-8bfc-63c8b2c8a351' 
AND product_name = 'Caramel' 
AND is_available = false;