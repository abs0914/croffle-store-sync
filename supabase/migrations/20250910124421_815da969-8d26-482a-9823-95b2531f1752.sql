-- Remove Croffle Overload from Premium category (keep only in Mix & Match)
DELETE FROM product_catalog 
WHERE product_name = 'Croffle Overload' 
AND category_id IN (
  SELECT c.id FROM categories c WHERE c.name = 'Premium'
);

-- Remove Mini Croffle from Mix & Match category (keep only in Mini Croffle category)
DELETE FROM product_catalog 
WHERE product_name = 'Mini Croffle' 
AND category_id IN (
  SELECT c.id FROM categories c WHERE c.name = 'Mix & Match'
);