-- =====================================================
-- CLEANUP INACTIVE DATA - MAINTENANCE SCRIPT
-- =====================================================
-- 
-- This script removes old inactive records to free up database space.
-- Run this monthly or when database performance degrades.
--
-- What this script does:
-- 1. Removes inactive recipe templates older than 30 days
-- 2. Removes inactive recipes older than 30 days  
-- 3. Removes inactive categories older than 30 days
-- 4. Cleans up orphaned ingredient records
-- 5. Updates database statistics
--
-- Prerequisites: 01_unified_recipe_system.sql must be run first
-- Execution: Copy and paste entire script into Supabase SQL Editor
-- Frequency: Monthly or as needed
-- =====================================================

-- Check current data before cleanup
SELECT 'BEFORE CLEANUP - Current Data Status' as status;

SELECT 
  'Recipe Templates' as table_name,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records,
  COUNT(*) as total_records
FROM recipe_templates

UNION ALL

SELECT 
  'Recipes' as table_name,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records,
  COUNT(*) as total_records
FROM recipes

UNION ALL

SELECT 
  'Categories' as table_name,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records,
  COUNT(*) as total_records
FROM categories;

-- Run the cleanup function (removes records older than 30 days)
SELECT 'RUNNING CLEANUP...' as status;

SELECT * FROM cleanup_inactive_data(30);

-- Clean up orphaned ingredient records
DELETE FROM recipe_template_ingredients 
WHERE recipe_template_id NOT IN (
  SELECT id FROM recipe_templates WHERE is_active = true
);

DELETE FROM recipe_ingredients 
WHERE recipe_id NOT IN (
  SELECT id FROM recipes WHERE is_active = true
);

-- Update database statistics for better performance
ANALYZE recipe_templates;
ANALYZE recipes;
ANALYZE product_catalog;
ANALYZE categories;
ANALYZE recipe_template_ingredients;
ANALYZE recipe_ingredients;

-- Check data after cleanup
SELECT 'AFTER CLEANUP - Updated Data Status' as status;

SELECT 
  'Recipe Templates' as table_name,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records,
  COUNT(*) as total_records
FROM recipe_templates

UNION ALL

SELECT 
  'Recipes' as table_name,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records,
  COUNT(*) as total_records
FROM recipes

UNION ALL

SELECT 
  'Categories' as table_name,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records,
  COUNT(*) as total_records
FROM categories;

-- Final success message
SELECT 'CLEANUP COMPLETE! Database optimized.' as status;
