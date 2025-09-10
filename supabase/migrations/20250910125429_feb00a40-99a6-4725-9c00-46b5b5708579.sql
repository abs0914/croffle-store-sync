-- Fix Mix & Match category setup
-- 1. Copy Mini Croffle products to Mix & Match category (keep them in both categories)
INSERT INTO product_catalog (
    store_id,
    product_name,
    description,
    price,
    category_id,
    recipe_id,
    is_available,
    display_order,
    created_at,
    updated_at
)
SELECT 
    pc.store_id,
    pc.product_name,
    pc.description,
    pc.price, -- Keep same price ₱65
    mm_cat.id as category_id, -- Mix & Match category
    pc.recipe_id,
    pc.is_available,
    pc.display_order,
    NOW(),
    NOW()
FROM product_catalog pc
JOIN categories mini_cat ON pc.category_id = mini_cat.id AND mini_cat.name = 'Mini Croffle'
JOIN categories mm_cat ON mm_cat.store_id = pc.store_id AND mm_cat.name = 'Mix & Match'
WHERE pc.product_name = 'Mini Croffle'
  AND NOT EXISTS (
    -- Don't duplicate if already exists in Mix & Match
    SELECT 1 FROM product_catalog pc2 
    WHERE pc2.store_id = pc.store_id 
      AND pc2.product_name = 'Mini Croffle' 
      AND pc2.category_id = mm_cat.id
  );

-- 2. Activate and set proper pricing for Croffle Overload in Mix & Match
UPDATE product_catalog 
SET 
    is_available = true,
    price = 95.00, -- Standard price for Croffle Overload
    updated_at = NOW()
WHERE product_name = 'Croffle Overload' 
  AND category_id IN (
    SELECT c.id FROM categories c WHERE c.name = 'Mix & Match'
  );