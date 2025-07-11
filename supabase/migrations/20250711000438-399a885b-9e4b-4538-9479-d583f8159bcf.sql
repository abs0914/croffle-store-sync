-- Update product catalog prices for deployed recipes with zero prices
UPDATE product_catalog 
SET price = CASE 
  WHEN recipe_id IS NOT NULL THEN 50.00  -- Default price for recipe-based products
  ELSE price 
END
WHERE price = 0 AND recipe_id IS NOT NULL;

-- Also update any products table entries that have zero prices
UPDATE products 
SET price = CASE 
  WHEN recipe_id IS NOT NULL THEN 50.00  -- Default price for recipe-based products
  ELSE price 
END
WHERE price = 0 AND recipe_id IS NOT NULL;