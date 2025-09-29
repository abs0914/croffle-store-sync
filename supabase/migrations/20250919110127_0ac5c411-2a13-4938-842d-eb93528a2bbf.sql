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

-- Update inventory timestamps to refresh the data
UPDATE inventory_stock 
SET updated_at = NOW() 
WHERE updated_at < CURRENT_DATE;