-- =====================================================
-- DATABASE DIAGNOSTIC SCRIPT
-- =====================================================
-- Run this first to understand your current database structure
-- This will help us create the correct fix

-- =====================================================
-- 1. CHECK WHICH TABLES EXIST
-- =====================================================

SELECT 'EXISTING TABLES' as section, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'conversion_ingredients', 
    'conversion_recipe_ingredients', 
    'conversion_recipes', 
    'inventory_conversions', 
    'commissary_inventory',
    'inventory_items',
    'inventory_stock',
    'recipes',
    'recipe_ingredients'
)
ORDER BY table_name;

-- =====================================================
-- 2. CHECK INVENTORY_CONVERSIONS STRUCTURE
-- =====================================================

SELECT 'INVENTORY_CONVERSIONS COLUMNS' as section, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_conversions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK COMMISSARY_INVENTORY STRUCTURE
-- =====================================================

SELECT 'COMMISSARY_INVENTORY COLUMNS' as section,
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name = 'commissary_inventory' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 4. CHECK EXISTING FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT 'FOREIGN KEY CONSTRAINTS' as section,
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
AND tc.table_name IN ('inventory_conversions', 'conversion_ingredients', 'conversion_recipe_ingredients')
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 5. CHECK IF CONVERSION TABLES EXIST AND THEIR STRUCTURE
-- =====================================================

-- Check conversion_recipes
SELECT 'CONVERSION_RECIPES EXISTS' as section, 
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'conversion_recipes' AND table_schema = 'public'
       ) THEN 'YES' ELSE 'NO' END as table_exists;

-- Check conversion_recipe_ingredients
SELECT 'CONVERSION_RECIPE_INGREDIENTS EXISTS' as section,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'conversion_recipe_ingredients' AND table_schema = 'public'
       ) THEN 'YES' ELSE 'NO' END as table_exists;

-- Check conversion_ingredients
SELECT 'CONVERSION_INGREDIENTS EXISTS' as section,
       CASE WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'conversion_ingredients' AND table_schema = 'public'
       ) THEN 'YES' ELSE 'NO' END as table_exists;

-- =====================================================
-- 6. CHECK SAMPLE DATA
-- =====================================================

-- Check if commissary_inventory has data
SELECT 'COMMISSARY_INVENTORY SAMPLE' as section, 
       count(*) as total_records
FROM public.commissary_inventory;

-- Check if inventory_conversions has data
SELECT 'INVENTORY_CONVERSIONS SAMPLE' as section,
       count(*) as total_records
FROM public.inventory_conversions;

-- Show a few commissary items if they exist
SELECT 'COMMISSARY_INVENTORY SAMPLE DATA' as section,
       id, name, category, current_stock
FROM public.commissary_inventory 
LIMIT 3;

-- =====================================================
-- 7. CHECK WHAT REFERENCES COMMISSARY_INVENTORY
-- =====================================================

-- Find all foreign keys that reference commissary_inventory
SELECT 'REFERENCES TO COMMISSARY_INVENTORY' as section,
    tc.table_name, 
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'commissary_inventory'
ORDER BY tc.table_name;

-- =====================================================
-- 8. CHECK WHAT REFERENCES INVENTORY_ITEMS
-- =====================================================

-- Find all foreign keys that reference inventory_items
SELECT 'REFERENCES TO INVENTORY_ITEMS' as section,
    tc.table_name, 
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'inventory_items'
ORDER BY tc.table_name;

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 'DIAGNOSTIC COMPLETE' as section, 
       'Check the results above to understand your database structure' as message;
