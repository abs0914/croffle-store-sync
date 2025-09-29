-- Fix minimum_threshold data issues in inventory_stock table
-- Replace string values with default numeric values

-- First, update any text 'minimum_threshold' values to a default of 10
UPDATE inventory_stock 
SET minimum_threshold = 10 
WHERE minimum_threshold::text = 'minimum_threshold' OR minimum_threshold IS NULL;

-- Ensure all minimum_threshold values are valid numbers
UPDATE inventory_stock 
SET minimum_threshold = 10 
WHERE minimum_threshold < 0 OR minimum_threshold IS NULL;

-- Add a check to ensure minimum_threshold is always a positive number
ALTER TABLE inventory_stock 
ADD CONSTRAINT minimum_threshold_positive 
CHECK (minimum_threshold >= 0);

-- Update any transaction mismatch data by ensuring store_id consistency
-- Fix transactions that have wrong store_id references
UPDATE transactions 
SET store_id = (
  SELECT store_id 
  FROM inventory_stock 
  WHERE inventory_stock.id = transactions.store_id 
  LIMIT 1
)
WHERE store_id IN (
  SELECT t.store_id 
  FROM transactions t
  LEFT JOIN stores s ON t.store_id = s.id
  WHERE s.id IS NULL
);

-- Update timestamps to ensure we have current data
UPDATE transactions 
SET updated_at = NOW() 
WHERE DATE(created_at) = CURRENT_DATE;

UPDATE inventory_stock 
SET updated_at = NOW() 
WHERE DATE(created_at) = CURRENT_DATE;