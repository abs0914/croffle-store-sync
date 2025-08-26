
-- Check the location_pricing table structure and constraints
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'location_pricing' 
  AND table_schema = 'public';

-- Check existing location_pricing records to see what values are used
SELECT DISTINCT location_type FROM location_pricing LIMIT 10;

-- Check if there's a check constraint on location_type
SELECT 
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'location_pricing' 
  AND tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public';
