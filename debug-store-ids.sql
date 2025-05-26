-- Debug store_ids data structure for robinsons.north@croffle.com
-- This will show us exactly how the data is stored

SELECT 
    'STORE_IDS DEBUG' as section,
    user_id,
    first_name,
    last_name,
    email,
    store_ids,
    pg_typeof(store_ids) as store_ids_type,
    array_length(store_ids, 1) as array_length,
    store_ids[1] as first_store_id,
    ('fd45e07e-7832-4f51-b46b-7ef604359b86' = ANY(store_ids)) as contains_target_store
FROM app_users 
WHERE email = 'robinsons.north@croffle.com';

-- Test the exact filter that should work
SELECT 
    'FILTER TEST' as section,
    user_id,
    first_name || ' ' || last_name as name,
    store_ids,
    ('fd45e07e-7832-4f51-b46b-7ef604359b86' = ANY(store_ids)) as should_match
FROM app_users 
WHERE role = 'cashier' 
  AND is_active = true
  AND 'fd45e07e-7832-4f51-b46b-7ef604359b86' = ANY(store_ids);
