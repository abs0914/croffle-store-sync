-- Remove all sales for today for Sugbo Mercado IT Park store
DO $$
DECLARE
    target_store_id UUID;
BEGIN
    -- Find the store ID for Sugbo Mercado IT Park (case insensitive)
    SELECT id INTO target_store_id 
    FROM stores 
    WHERE LOWER(name) LIKE '%sugbo%mercado%it%park%' 
    LIMIT 1;
    
    -- Check if store was found
    IF target_store_id IS NULL THEN
        RAISE NOTICE 'Store "sugbo mercado it park" not found';
        RETURN;
    END IF;
    
    -- Delete all transactions for today for this store
    DELETE FROM transactions 
    WHERE store_id = target_store_id 
    AND DATE(created_at) = CURRENT_DATE;
    
    -- Log the result
    RAISE NOTICE 'Deleted transactions for store: % for date: %', target_store_id, CURRENT_DATE;
END $$;