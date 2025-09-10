-- Fix Missing Rectangle Ingredients and Unit Inconsistencies (Corrected)

-- Step 1: Add missing Rectangle ingredients to recipes that should have them
INSERT INTO recipe_ingredients (
  recipe_id,
  ingredient_name,
  quantity,
  unit,
  cost_per_unit,
  created_at,
  updated_at
)
SELECT DISTINCT
  r.id as recipe_id,
  'Rectangle' as ingredient_name,
  1 as quantity,
  'pieces'::inventory_unit as unit,
  1.00 as cost_per_unit,
  NOW() as created_at,
  NOW() as updated_at
FROM recipes r
JOIN recipe_templates rt ON r.template_id = rt.id
WHERE r.is_active = true
  AND rt.is_active = true
  AND rt.name IN (
    'KitKat Croffle',
    'Mango Croffle', 
    'Caramel Delight Croffle',
    'Glaze Croffle',
    'Regular Croffle',
    'Mini Croffle',
    'Croffle Overload'
  )
  AND NOT EXISTS (
    SELECT 1 FROM recipe_ingredients ri
    WHERE ri.recipe_id = r.id 
      AND LOWER(TRIM(ri.ingredient_name)) = 'rectangle'
  );

-- Step 2: Fix Whipped Cream unit inconsistencies (change ml to pieces for serving-based measurement)
UPDATE recipe_ingredients 
SET 
  unit = 'pieces'::inventory_unit,
  updated_at = NOW()
WHERE LOWER(TRIM(ingredient_name)) LIKE '%whipped cream%'
  AND unit = 'ml'::inventory_unit;

-- Step 3: Create missing conversion_mappings table for enhanced inventory tracking
CREATE TABLE IF NOT EXISTS conversion_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_stock_id UUID NOT NULL,
  recipe_ingredient_name TEXT NOT NULL,
  recipe_ingredient_unit TEXT NOT NULL,
  conversion_factor NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for conversion_mappings
ALTER TABLE conversion_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversion mappings for their stores" ON conversion_mappings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM inventory_stock ist
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE ist.id = conversion_mappings.inventory_stock_id
      AND (au.role IN ('admin', 'owner') OR ist.store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "Admins can manage conversion mappings" ON conversion_mappings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
);

-- Step 4: Create inventory_deduction_logs table for tracking deductions
CREATE TABLE IF NOT EXISTS inventory_deduction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  recipe_id UUID NOT NULL,
  inventory_stock_id UUID NOT NULL,
  ingredient_name TEXT NOT NULL,
  recipe_quantity_needed NUMERIC(10,4) NOT NULL,
  inventory_quantity_deducted NUMERIC(10,4) NOT NULL,
  conversion_factor NUMERIC(10,4) DEFAULT 1.0,
  previous_stock NUMERIC(10,4) NOT NULL,
  new_stock NUMERIC(10,4) NOT NULL,
  deduction_status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for inventory_deduction_logs
ALTER TABLE inventory_deduction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deduction logs for their stores" ON inventory_deduction_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM inventory_stock ist
    JOIN app_users au ON au.user_id = auth.uid()
    WHERE ist.id = inventory_deduction_logs.inventory_stock_id
      AND (au.role IN ('admin', 'owner') OR ist.store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "System can insert deduction logs" ON inventory_deduction_logs
FOR INSERT WITH CHECK (true);

-- Step 5: Populate conversion mappings for existing ingredient mappings
INSERT INTO conversion_mappings (
  inventory_stock_id,
  recipe_ingredient_name,
  recipe_ingredient_unit,
  conversion_factor,
  notes,
  created_at,
  updated_at
)
SELECT DISTINCT
  rim.inventory_stock_id,
  rim.ingredient_name,
  ri.unit::text,
  1.0,
  'Auto-generated from existing recipe ingredient mappings',
  NOW(),
  NOW()
FROM recipe_ingredient_mappings rim
JOIN recipe_ingredients ri ON ri.recipe_id = rim.recipe_id 
  AND LOWER(TRIM(ri.ingredient_name)) = LOWER(TRIM(rim.ingredient_name))
WHERE rim.inventory_stock_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verification: Show the fixes applied
SELECT 
  'FIXES APPLIED' as report_type,
  COUNT(CASE WHEN action = 'rectangle_added' THEN 1 END) as rectangles_added,
  COUNT(CASE WHEN action = 'whipped_cream_fixed' THEN 1 END) as whipped_cream_units_fixed,
  COUNT(CASE WHEN action = 'conversion_mapping' THEN 1 END) as conversion_mappings_created
FROM (
  -- Count Rectangle ingredients added
  SELECT 'rectangle_added' as action
  FROM recipe_ingredients ri
  JOIN recipes r ON r.id = ri.recipe_id
  WHERE LOWER(TRIM(ri.ingredient_name)) = 'rectangle'
    AND ri.created_at > NOW() - INTERVAL '1 minute'
  
  UNION ALL
  
  -- Count Whipped Cream units fixed
  SELECT 'whipped_cream_fixed' as action
  FROM recipe_ingredients ri
  WHERE LOWER(TRIM(ri.ingredient_name)) LIKE '%whipped cream%'
    AND ri.unit = 'pieces'
    AND ri.updated_at > NOW() - INTERVAL '1 minute'
  
  UNION ALL
  
  -- Count conversion mappings created
  SELECT 'conversion_mapping' as action
  FROM conversion_mappings
  WHERE created_at > NOW() - INTERVAL '1 minute'
) fixes;