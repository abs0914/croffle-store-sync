-- PHASE 5: RADICAL SIMPLIFICATION
-- Step 1: Create pre-computed mix & match deductions table
-- This eliminates complex real-time processing during payment

CREATE TABLE IF NOT EXISTS mix_match_ingredient_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  base_name TEXT NOT NULL, -- e.g., "Mini Croffle", "Croffle Overload"
  ingredient_name TEXT NOT NULL,
  inventory_stock_id UUID REFERENCES inventory_stock(id),
  quantity_per_unit NUMERIC NOT NULL DEFAULT 1,
  ingredient_category TEXT NOT NULL CHECK (ingredient_category IN ('base', 'choice', 'packaging')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, product_name, ingredient_name)
);

-- Index for fast lookups during payment processing
CREATE INDEX idx_mix_match_deductions_lookup 
ON mix_match_ingredient_deductions(store_id, product_name, is_active) 
WHERE is_active = true;

-- Index for ingredient matching
CREATE INDEX idx_mix_match_deductions_ingredient 
ON mix_match_ingredient_deductions(store_id, base_name, ingredient_category, is_active)
WHERE is_active = true;

-- Step 2: Create materialized view for product availability
-- This eliminates the need for complex joins during product display
CREATE MATERIALIZED VIEW IF NOT EXISTS product_availability_summary AS
SELECT 
  pc.id as product_id,
  pc.product_name,
  pc.store_id,
  pc.price,
  pc.is_available,
  pc.recipe_id,
  CASE 
    WHEN pc.recipe_id IS NULL THEN 'direct'
    ELSE 'recipe'
  END as product_type,
  CASE
    WHEN pc.recipe_id IS NULL THEN true
    WHEN EXISTS (
      SELECT 1 FROM recipe_ingredients ri
      WHERE ri.recipe_id = pc.recipe_id
      AND ri.inventory_stock_id IS NOT NULL
    ) THEN true
    ELSE false
  END as has_valid_recipe,
  COALESCE(
    (SELECT COUNT(*) FROM recipe_ingredients ri 
     WHERE ri.recipe_id = pc.recipe_id),
    0
  ) as ingredient_count
FROM product_catalog pc
WHERE pc.is_available = true;

-- Index on materialized view for fast queries
CREATE UNIQUE INDEX idx_product_availability_product 
ON product_availability_summary(product_id);

CREATE INDEX idx_product_availability_store 
ON product_availability_summary(store_id, is_available);

-- Step 3: Function to populate mix & match deductions from existing recipes
CREATE OR REPLACE FUNCTION populate_mix_match_deductions()
RETURNS void AS $$
DECLARE
  store_rec RECORD;
  recipe_rec RECORD;
  ingredient_rec RECORD;
  base_name TEXT;
  ingredient_category TEXT;
BEGIN
  -- Clear existing deductions
  TRUNCATE mix_match_ingredient_deductions;
  
  -- Process each store
  FOR store_rec IN 
    SELECT id, name FROM stores WHERE is_active = true
  LOOP
    -- Find Mix & Match recipes (Mini Croffle, Croffle Overload)
    FOR recipe_rec IN
      SELECT DISTINCT 
        r.id as recipe_id,
        r.name as recipe_name,
        pc.product_name,
        pc.store_id
      FROM recipes r
      JOIN product_catalog pc ON pc.recipe_id = r.id
      WHERE r.store_id = store_rec.id
        AND r.is_active = true
        AND (
          LOWER(r.name) LIKE '%mini croffle%'
          OR LOWER(r.name) LIKE '%croffle overload%'
        )
    LOOP
      -- Extract base name (remove " with ..." part)
      base_name := SPLIT_PART(recipe_rec.recipe_name, ' with ', 1);
      
      -- Process each ingredient in the recipe
      FOR ingredient_rec IN
        SELECT 
          ri.inventory_stock_id,
          ri.quantity,
          COALESCE(ri.ingredient_group_name, 'base') as group_name,
          ist.item as ingredient_name
        FROM recipe_ingredients ri
        LEFT JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
        WHERE ri.recipe_id = recipe_rec.recipe_id
          AND ist.is_active = true
      LOOP
        -- Categorize ingredients
        IF ingredient_rec.group_name IN ('sauce', 'topping', 'choice') THEN
          ingredient_category := 'choice';
        ELSIF ingredient_rec.group_name = 'packaging' OR 
              LOWER(ingredient_rec.ingredient_name) LIKE '%box%' OR
              LOWER(ingredient_rec.ingredient_name) LIKE '%bag%' THEN
          ingredient_category := 'packaging';
        ELSE
          ingredient_category := 'base';
        END IF;
        
        -- Insert deduction rule
        INSERT INTO mix_match_ingredient_deductions (
          store_id,
          product_name,
          base_name,
          ingredient_name,
          inventory_stock_id,
          quantity_per_unit,
          ingredient_category,
          is_active
        ) VALUES (
          store_rec.id,
          recipe_rec.product_name,
          base_name,
          ingredient_rec.ingredient_name,
          ingredient_rec.inventory_stock_id,
          ingredient_rec.quantity,
          ingredient_category,
          true
        )
        ON CONFLICT (store_id, product_name, ingredient_name) 
        DO UPDATE SET
          quantity_per_unit = EXCLUDED.quantity_per_unit,
          ingredient_category = EXCLUDED.ingredient_category,
          updated_at = now();
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Mix & Match deductions populated successfully';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Refresh materialized view function
CREATE OR REPLACE FUNCTION refresh_product_availability()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_availability_summary;
  RAISE NOTICE 'Product availability summary refreshed';
END;
$$ LANGUAGE plpgsql;

-- Step 5: Populate initial data
SELECT populate_mix_match_deductions();
SELECT refresh_product_availability();

COMMENT ON TABLE mix_match_ingredient_deductions IS 'Pre-computed ingredient deductions for Mix & Match products - eliminates complex real-time processing';
COMMENT ON MATERIALIZED VIEW product_availability_summary IS 'Pre-computed product availability - eliminates complex joins during product display';
COMMENT ON FUNCTION populate_mix_match_deductions() IS 'Populates mix & match deductions from existing recipes - run after recipe changes';
COMMENT ON FUNCTION refresh_product_availability() IS 'Refreshes product availability materialized view - run periodically or after inventory changes';