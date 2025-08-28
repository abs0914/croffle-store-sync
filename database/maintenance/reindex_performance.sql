-- =====================================================
-- REINDEX PERFORMANCE - MAINTENANCE SCRIPT
-- =====================================================
-- 
-- This script rebuilds database indexes and updates statistics for optimal performance.
-- Run this when queries are slow or after large data operations.
--
-- What this script does:
-- 1. Rebuilds all performance-critical indexes
-- 2. Updates table statistics for query optimization
-- 3. Checks index usage and health
-- 4. Provides performance recommendations
--
-- Prerequisites: 01_unified_recipe_system.sql must be run first
-- Execution: Copy and paste entire script into Supabase SQL Editor
-- Frequency: As needed when performance degrades
-- =====================================================

-- Check current index status
SELECT 'BEFORE REINDEX - Current Index Status' as status;

SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('recipe_templates', 'recipes', 'product_catalog', 'categories')
ORDER BY tablename, indexname;

-- Rebuild performance indexes
SELECT 'REBUILDING INDEXES...' as status;

-- Recipe Templates indexes
REINDEX INDEX IF EXISTS idx_recipe_templates_active;
REINDEX INDEX IF EXISTS recipe_templates_pkey;

-- Recipes indexes  
REINDEX INDEX IF EXISTS idx_recipes_template_store;
REINDEX INDEX IF EXISTS recipes_pkey;

-- Product Catalog indexes
REINDEX INDEX IF EXISTS idx_product_catalog_category_id;
REINDEX INDEX IF EXISTS idx_product_catalog_store_category;
REINDEX INDEX IF EXISTS product_catalog_pkey;

-- Categories indexes
REINDEX INDEX IF EXISTS idx_categories_store_name;
REINDEX INDEX IF EXISTS categories_pkey;
REINDEX INDEX IF EXISTS categories_store_id_name_key;

-- Rebuild table indexes completely
SELECT 'REBUILDING TABLE INDEXES...' as status;

REINDEX TABLE recipe_templates;
REINDEX TABLE recipes;
REINDEX TABLE product_catalog;
REINDEX TABLE categories;
REINDEX TABLE recipe_template_ingredients;
REINDEX TABLE recipe_ingredients;

-- Update table statistics for query planner
SELECT 'UPDATING STATISTICS...' as status;

ANALYZE recipe_templates;
ANALYZE recipes;
ANALYZE product_catalog;
ANALYZE categories;
ANALYZE recipe_template_ingredients;
ANALYZE recipe_ingredients;

-- Check table sizes and statistics
SELECT 'TABLE SIZE ANALYSIS' as status;

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('recipe_templates', 'recipes', 'product_catalog', 'categories')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for unused indexes
SELECT 'UNUSED INDEX ANALYSIS' as status;

SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED - Consider dropping'
    WHEN idx_scan < 10 THEN 'LOW USAGE - Monitor'
    ELSE 'ACTIVE'
  END as usage_status
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('recipe_templates', 'recipes', 'product_catalog', 'categories')
ORDER BY idx_scan ASC;

-- Performance recommendations
SELECT 'PERFORMANCE RECOMMENDATIONS' as status;

WITH table_stats AS (
  SELECT 
    tablename,
    n_live_tup,
    n_dead_tup,
    CASE 
      WHEN n_live_tup > 0 THEN (n_dead_tup::FLOAT / n_live_tup::FLOAT) * 100
      ELSE 0
    END as dead_tuple_percentage
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public' 
    AND tablename IN ('recipe_templates', 'recipes', 'product_catalog', 'categories')
)
SELECT 
  tablename,
  ROUND(dead_tuple_percentage, 2) as dead_tuple_pct,
  CASE 
    WHEN dead_tuple_percentage > 20 THEN 'VACUUM RECOMMENDED'
    WHEN dead_tuple_percentage > 10 THEN 'MONITOR CLOSELY'
    ELSE 'HEALTHY'
  END as recommendation
FROM table_stats
ORDER BY dead_tuple_percentage DESC;

-- Run VACUUM if needed (optional - uncomment if you want automatic vacuum)
-- VACUUM ANALYZE recipe_templates;
-- VACUUM ANALYZE recipes;
-- VACUUM ANALYZE product_catalog;
-- VACUUM ANALYZE categories;

-- Check after reindex
SELECT 'AFTER REINDEX - Updated Index Status' as status;

SELECT 
  schemaname,
  tablename,
  COUNT(*) as index_count,
  SUM(idx_tup_read) as total_reads,
  SUM(idx_tup_fetch) as total_fetches
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('recipe_templates', 'recipes', 'product_catalog', 'categories')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Final success message
SELECT 'PERFORMANCE OPTIMIZATION COMPLETE!' as status;

-- Performance test query
SELECT 'PERFORMANCE TEST - Recipe Management Summary' as status;

SELECT * FROM recipe_management_summary LIMIT 5;

SELECT 'All indexes rebuilt and statistics updated successfully!' as final_status;
