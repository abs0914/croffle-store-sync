-- Comprehensive fix for ingredient definitions and deduction logic

-- 1. First, let's populate product_ingredients for products that have recipes with ingredients
INSERT INTO product_ingredients (
  product_catalog_id,
  inventory_stock_id,
  commissary_item_id,
  required_quantity,
  unit
)
SELECT DISTINCT
  pc.id as product_catalog_id,
  ri.inventory_stock_id,
  ri.commissary_item_id,
  ri.quantity as required_quantity,
  ri.unit
FROM product_catalog pc
JOIN recipes r ON pc.recipe_id = r.id
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
WHERE NOT EXISTS (
  SELECT 1 FROM product_ingredients pi 
  WHERE pi.product_catalog_id = pc.id
)
AND (ri.inventory_stock_id IS NOT NULL OR ri.commissary_item_id IS NOT NULL);

-- 2. For products without recipes, let's create basic ingredient mappings based on product names
-- This covers common products like Coffee, Ice Cream, etc.

-- Coffee products - map to Coffee inventory items
INSERT INTO product_ingredients (
  product_catalog_id,
  inventory_stock_id,
  required_quantity,
  unit
)
SELECT DISTINCT
  pc.id as product_catalog_id,
  ist.id as inventory_stock_id,
  1 as required_quantity,
  'Serving' as unit
FROM product_catalog pc
JOIN inventory_stock ist ON ist.store_id = pc.store_id
WHERE LOWER(pc.product_name) LIKE '%coffee%' 
  OR LOWER(pc.product_name) LIKE '%americano%'
  OR LOWER(pc.product_name) LIKE '%espresso%'
  OR LOWER(pc.product_name) LIKE '%latte%'
  OR LOWER(pc.product_name) LIKE '%cappuccino%'
  AND LOWER(ist.item) LIKE '%coffee%'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_ingredients pi 
    WHERE pi.product_catalog_id = pc.id
  );

-- Ice cream products - map to Ice Cream inventory items
INSERT INTO product_ingredients (
  product_catalog_id,
  inventory_stock_id,
  required_quantity,
  unit
)
SELECT DISTINCT
  pc.id as product_catalog_id,
  ist.id as inventory_stock_id,
  1 as required_quantity,
  'Scoop' as unit
FROM product_catalog pc
JOIN inventory_stock ist ON ist.store_id = pc.store_id
WHERE LOWER(pc.product_name) LIKE '%ice cream%'
  AND LOWER(ist.item) LIKE '%ice cream%'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_ingredients pi 
    WHERE pi.product_catalog_id = pc.id
  );

-- Biscoff products - map to Biscoff inventory items
INSERT INTO product_ingredients (
  product_catalog_id,
  inventory_stock_id,
  required_quantity,
  unit
)
SELECT DISTINCT
  pc.id as product_catalog_id,
  ist.id as inventory_stock_id,
  1 as required_quantity,
  'Portion' as unit
FROM product_catalog pc
JOIN inventory_stock ist ON ist.store_id = pc.store_id
WHERE LOWER(pc.product_name) LIKE '%biscoff%'
  AND LOWER(ist.item) LIKE '%biscoff%'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_ingredients pi 
    WHERE pi.product_catalog_id = pc.id
  );

-- Croffle products - map to Croissant inventory items
INSERT INTO product_ingredients (
  product_catalog_id,
  inventory_stock_id,
  required_quantity,
  unit
)
SELECT DISTINCT
  pc.id as product_catalog_id,
  ist.id as inventory_stock_id,
  CASE 
    WHEN LOWER(pc.product_name) LIKE '%mini%' THEN 0.5
    WHEN LOWER(pc.product_name) LIKE '%overload%' THEN 1.5
    ELSE 1
  END as required_quantity,
  'Pieces' as unit
FROM product_catalog pc
JOIN inventory_stock ist ON ist.store_id = pc.store_id
WHERE LOWER(pc.product_name) LIKE '%croffle%'
  AND LOWER(ist.item) LIKE '%croissant%'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_ingredients pi 
    WHERE pi.product_catalog_id = pc.id
  );

-- Add ice cream for croffle products
INSERT INTO product_ingredients (
  product_catalog_id,
  inventory_stock_id,
  required_quantity,
  unit
)
SELECT DISTINCT
  pc.id as product_catalog_id,
  ist.id as inventory_stock_id,
  CASE 
    WHEN LOWER(pc.product_name) LIKE '%mini%' THEN 0.5
    WHEN LOWER(pc.product_name) LIKE '%overload%' THEN 2
    ELSE 1
  END as required_quantity,
  'Scoop' as unit
FROM product_catalog pc
JOIN inventory_stock ist ON ist.store_id = pc.store_id
WHERE LOWER(pc.product_name) LIKE '%croffle%'
  AND LOWER(ist.item) LIKE '%ice cream%'
  AND ist.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM product_ingredients pi 
    WHERE pi.product_catalog_id = pc.id 
    AND pi.inventory_stock_id = ist.id
  );

-- Create a function to validate product ingredient availability
CREATE OR REPLACE FUNCTION validate_product_ingredients_availability(
  product_id UUID,
  quantity INTEGER DEFAULT 1
) RETURNS TABLE(
  is_available BOOLEAN,
  missing_ingredients TEXT[],
  insufficient_stock TEXT[]
) LANGUAGE plpgsql AS $$
DECLARE
  missing_items TEXT[] := '{}';
  insufficient_items TEXT[] := '{}';
  ingredient_record RECORD;
  required_qty NUMERIC;
BEGIN
  -- Check all product ingredients
  FOR ingredient_record IN 
    SELECT 
      pi.required_quantity,
      pi.unit,
      ist.item,
      ist.stock_quantity,
      ist.id as inventory_id
    FROM product_ingredients pi
    JOIN inventory_stock ist ON pi.inventory_stock_id = ist.id
    WHERE pi.product_catalog_id = product_id
      AND ist.is_active = true
  LOOP
    required_qty := ingredient_record.required_quantity * quantity;
    
    IF ingredient_record.stock_quantity < required_qty THEN
      insufficient_items := insufficient_items || (
        ingredient_record.item || ' (Need: ' || required_qty::TEXT || 
        ', Have: ' || ingredient_record.stock_quantity::TEXT || ')'
      );
    END IF;
  END LOOP;
  
  -- Check if we have any ingredients defined
  IF NOT EXISTS (
    SELECT 1 FROM product_ingredients pi 
    WHERE pi.product_catalog_id = product_id
  ) THEN
    missing_items := missing_items || 'No ingredients defined for this product';
  END IF;
  
  RETURN QUERY SELECT 
    (array_length(missing_items, 1) IS NULL AND array_length(insufficient_items, 1) IS NULL),
    missing_items,
    insufficient_items;
END;
$$;