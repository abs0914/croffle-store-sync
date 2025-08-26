-- Standardize store inventory units to match master recipe units
-- Master units: ml, grams, piece, portion, Scoop, serving, pair

-- Step 1: Direct unit standardization (case corrections)
UPDATE inventory_stock 
SET unit = 'grams', updated_at = NOW()
WHERE unit IN ('g', 'Grams') AND is_active = true;

UPDATE inventory_stock 
SET unit = 'piece', updated_at = NOW()
WHERE unit IN ('Piece', 'pieces', 'pieces ', 'Pieces') AND is_active = true;

UPDATE inventory_stock 
SET unit = 'portion', updated_at = NOW()
WHERE unit IN ('Portion', 'portions') AND is_active = true;

UPDATE inventory_stock 
SET unit = 'serving', updated_at = NOW()
WHERE unit IN ('Serving') AND is_active = true;

-- Step 2: Convert kg to grams (multiply quantity by 1000, divide cost by 1000)
UPDATE inventory_stock 
SET 
  unit = 'grams',
  stock_quantity = stock_quantity * 1000,
  cost = CASE WHEN cost IS NOT NULL THEN cost / 1000 ELSE cost END,
  cost_per_serving = CASE WHEN cost_per_serving IS NOT NULL THEN cost_per_serving / 1000 ELSE cost_per_serving END,
  updated_at = NOW()
WHERE unit = 'kg' AND is_active = true;

-- Step 3: Convert liters to ml (multiply quantity by 1000, divide cost by 1000)
UPDATE inventory_stock 
SET 
  unit = 'ml',
  stock_quantity = stock_quantity * 1000,
  cost = CASE WHEN cost IS NOT NULL THEN cost / 1000 ELSE cost END,
  cost_per_serving = CASE WHEN cost_per_serving IS NOT NULL THEN cost_per_serving / 1000 ELSE cost_per_serving END,
  updated_at = NOW()
WHERE unit IN ('liters', 'liter') AND is_active = true;

-- Step 4: Add recipe compatibility tracking
ALTER TABLE inventory_stock 
ADD COLUMN IF NOT EXISTS recipe_compatible boolean DEFAULT true;

-- Mark bulk units as non-recipe compatible
UPDATE inventory_stock 
SET recipe_compatible = false, updated_at = NOW()
WHERE unit IN ('boxes', 'packs', 'Box', 'pack', 'Pack of 25', 'Pack of 50', 'Pack of 100', 'Pack of 20', 'Pack of 32', 'Pack of 24', 'Pack of 27', 'Piping Bag') 
AND is_active = true;

-- Step 5: Validation report
SELECT 
  'STANDARDIZATION COMPLETE' as status,
  unit, 
  COUNT(*) as count,
  CASE WHEN unit IN ('ml', 'grams', 'piece', 'portion', 'Scoop', 'serving', 'pair') 
       THEN '✅ Master Recipe Compatible' 
       ELSE '❌ Not Compatible' 
  END as compatibility_status
FROM inventory_stock 
WHERE is_active = true AND recipe_compatible = true
GROUP BY unit 
ORDER BY count DESC;