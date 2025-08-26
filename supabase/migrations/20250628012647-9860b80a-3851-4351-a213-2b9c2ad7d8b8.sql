
-- First, let's check the current foreign key constraints on conversion_recipe_ingredients
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'conversion_recipe_ingredients';

-- Drop the incorrect foreign key constraint if it exists
ALTER TABLE public.conversion_recipe_ingredients 
DROP CONSTRAINT IF EXISTS conversion_recipe_ingredients_commissary_item_id_fkey;

-- Add the correct foreign key constraint pointing to commissary_inventory
ALTER TABLE public.conversion_recipe_ingredients
ADD CONSTRAINT conversion_recipe_ingredients_commissary_item_id_fkey
FOREIGN KEY (commissary_item_id) REFERENCES public.commissary_inventory(id) ON DELETE CASCADE;

-- Verify the constraint was created correctly
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'conversion_recipe_ingredients'
AND kcu.column_name = 'commissary_item_id';
