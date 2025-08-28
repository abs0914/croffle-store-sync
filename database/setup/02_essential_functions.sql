-- =====================================================
-- ESSENTIAL FUNCTIONS - ADVANCED FEATURES
-- =====================================================
-- 
-- This script adds advanced functions and utilities for the recipe system.
-- Run this AFTER 01_unified_recipe_system.sql
--
-- What this script does:
-- 1. Creates advanced reporting functions
-- 2. Sets up data validation functions
-- 3. Creates bulk operation functions
-- 4. Sets up monitoring and health check functions
--
-- Prerequisites: 01_unified_recipe_system.sql must be run first
-- Execution: Copy and paste entire script into Supabase SQL Editor
-- =====================================================

-- Function to get system health status
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE(
  metric TEXT,
  value TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH health_metrics AS (
    SELECT 
      'Total Active Templates' as metric,
      COUNT(*)::TEXT as value,
      CASE WHEN COUNT(*) > 0 THEN 'Good' ELSE 'Warning' END as status
    FROM recipe_templates WHERE is_active = true
    
    UNION ALL
    
    SELECT 
      'Total Active Recipes' as metric,
      COUNT(*)::TEXT as value,
      CASE WHEN COUNT(*) > 0 THEN 'Good' ELSE 'Warning' END as status
    FROM recipes WHERE is_active = true
    
    UNION ALL
    
    SELECT 
      'Product Categorization Rate' as metric,
      ROUND(
        (COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(*), 0)) * 100, 1
      )::TEXT || '%' as value,
      CASE 
        WHEN ROUND((COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) >= 85 THEN 'Good'
        WHEN ROUND((COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) >= 70 THEN 'Warning'
        ELSE 'Critical'
      END as status
    FROM product_catalog WHERE is_available = true
    
    UNION ALL
    
    SELECT 
      'Active Stores' as metric,
      COUNT(*)::TEXT as value,
      CASE WHEN COUNT(*) > 0 THEN 'Good' ELSE 'Critical' END as status
    FROM stores WHERE is_active = true
    
    UNION ALL
    
    SELECT 
      'Total Categories' as metric,
      COUNT(*)::TEXT as value,
      CASE WHEN COUNT(*) > 0 THEN 'Good' ELSE 'Warning' END as status
    FROM categories WHERE is_active = true
  )
  SELECT * FROM health_metrics;
END;
$$ LANGUAGE plpgsql;

-- Function to validate recipe data integrity
CREATE OR REPLACE FUNCTION validate_recipe_integrity()
RETURNS TABLE(
  check_name TEXT,
  issue_count INTEGER,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH integrity_checks AS (
    -- Check for recipes without templates
    SELECT 
      'Recipes without templates' as check_name,
      COUNT(*)::INTEGER as issue_count,
      CASE WHEN COUNT(*) = 0 THEN 'Pass' ELSE 'Fail' END as status,
      'Recipes that reference non-existent templates' as details
    FROM recipes r
    LEFT JOIN recipe_templates rt ON r.template_id = rt.id
    WHERE r.is_active = true AND rt.id IS NULL
    
    UNION ALL
    
    -- Check for products without categories
    SELECT 
      'Products without categories' as check_name,
      COUNT(*)::INTEGER as issue_count,
      CASE WHEN COUNT(*) = 0 THEN 'Pass' ELSE 'Warning' END as status,
      'Product catalog entries missing category assignment' as details
    FROM product_catalog
    WHERE is_available = true AND category_id IS NULL
    
    UNION ALL
    
    -- Check for templates without ingredients
    SELECT 
      'Templates without ingredients' as check_name,
      COUNT(*)::INTEGER as issue_count,
      CASE WHEN COUNT(*) = 0 THEN 'Pass' ELSE 'Warning' END as status,
      'Recipe templates with no ingredient specifications' as details
    FROM recipe_templates rt
    LEFT JOIN recipe_template_ingredients rti ON rt.id = rti.recipe_template_id
    WHERE rt.is_active = true AND rti.id IS NULL
    
    UNION ALL
    
    -- Check for duplicate categories per store
    SELECT 
      'Duplicate categories per store' as check_name,
      COUNT(*)::INTEGER as issue_count,
      CASE WHEN COUNT(*) = 0 THEN 'Pass' ELSE 'Fail' END as status,
      'Stores with duplicate category names' as details
    FROM (
      SELECT store_id, name, COUNT(*) as cnt
      FROM categories
      WHERE is_active = true
      GROUP BY store_id, name
      HAVING COUNT(*) > 1
    ) duplicates
  )
  SELECT * FROM integrity_checks;
END;
$$ LANGUAGE plpgsql;

-- Function to bulk update product categories
CREATE OR REPLACE FUNCTION bulk_update_product_categories()
RETURNS TABLE(
  store_name TEXT,
  products_updated INTEGER,
  products_failed INTEGER
) AS $$
DECLARE
  store_record RECORD;
  product_record RECORD;
  category_id_var UUID;
  updated_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  -- Loop through each store
  FOR store_record IN 
    SELECT id, name FROM stores WHERE is_active = true
  LOOP
    updated_count := 0;
    failed_count := 0;
    
    -- Loop through uncategorized products in this store
    FOR product_record IN
      SELECT pc.id, pc.store_id, rt.category_name
      FROM product_catalog pc
      JOIN recipes r ON pc.recipe_id = r.id
      JOIN recipe_templates rt ON r.template_id = rt.id
      WHERE pc.store_id = store_record.id
        AND pc.category_id IS NULL
        AND pc.is_available = true
        AND rt.category_name IS NOT NULL
    LOOP
      BEGIN
        -- Get or create category
        category_id_var := get_or_create_category(product_record.store_id, product_record.category_name);
        
        -- Update product
        UPDATE product_catalog 
        SET category_id = category_id_var, updated_at = NOW()
        WHERE id = product_record.id;
        
        updated_count := updated_count + 1;
        
      EXCEPTION WHEN OTHERS THEN
        failed_count := failed_count + 1;
      END;
    END LOOP;
    
    RETURN QUERY SELECT store_record.name, updated_count, failed_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get detailed category statistics
CREATE OR REPLACE FUNCTION get_category_statistics()
RETURNS TABLE(
  store_name TEXT,
  category_name TEXT,
  product_count INTEGER,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name as store_name,
    COALESCE(c.name, 'Uncategorized') as category_name,
    COUNT(pc.id)::INTEGER as product_count,
    ROUND(
      (COUNT(pc.id)::NUMERIC / 
       SUM(COUNT(pc.id)) OVER (PARTITION BY s.id)) * 100, 2
    ) as percentage
  FROM stores s
  LEFT JOIN product_catalog pc ON s.id = pc.store_id AND pc.is_available = true
  LEFT JOIN categories c ON pc.category_id = c.id
  WHERE s.is_active = true
  GROUP BY s.id, s.name, c.id, c.name
  HAVING COUNT(pc.id) > 0
  ORDER BY s.name, product_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up inactive data
CREATE OR REPLACE FUNCTION cleanup_inactive_data(days_old INTEGER DEFAULT 30)
RETURNS TABLE(
  table_name TEXT,
  records_cleaned INTEGER
) AS $$
DECLARE
  cleanup_date TIMESTAMP := NOW() - (days_old || ' days')::INTERVAL;
  cleaned_count INTEGER;
BEGIN
  -- Clean up old inactive recipe templates
  DELETE FROM recipe_template_ingredients 
  WHERE recipe_template_id IN (
    SELECT id FROM recipe_templates 
    WHERE is_active = false AND updated_at < cleanup_date
  );
  
  DELETE FROM recipe_templates 
  WHERE is_active = false AND updated_at < cleanup_date;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN QUERY SELECT 'recipe_templates'::TEXT, cleaned_count;
  
  -- Clean up old inactive recipes
  DELETE FROM recipe_ingredients 
  WHERE recipe_id IN (
    SELECT id FROM recipes 
    WHERE is_active = false AND updated_at < cleanup_date
  );
  
  DELETE FROM recipes 
  WHERE is_active = false AND updated_at < cleanup_date;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN QUERY SELECT 'recipes'::TEXT, cleaned_count;
  
  -- Clean up old inactive categories
  DELETE FROM categories 
  WHERE is_active = false AND updated_at < cleanup_date;
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN QUERY SELECT 'categories'::TEXT, cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to rebuild performance indexes
CREATE OR REPLACE FUNCTION rebuild_performance_indexes()
RETURNS TEXT AS $$
BEGIN
  -- Reindex key tables for performance
  REINDEX TABLE recipe_templates;
  REINDEX TABLE recipes;
  REINDEX TABLE product_catalog;
  REINDEX TABLE categories;
  
  -- Update table statistics
  ANALYZE recipe_templates;
  ANALYZE recipes;
  ANALYZE product_catalog;
  ANALYZE categories;
  
  RETURN 'Performance indexes rebuilt and statistics updated';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for all new functions
GRANT EXECUTE ON FUNCTION get_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_recipe_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_product_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_data(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_performance_indexes() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_system_health() IS 'Returns overall system health metrics and status';
COMMENT ON FUNCTION validate_recipe_integrity() IS 'Validates data integrity across recipe-related tables';
COMMENT ON FUNCTION bulk_update_product_categories() IS 'Updates categories for all uncategorized products';
COMMENT ON FUNCTION get_category_statistics() IS 'Returns detailed statistics about product categorization';
COMMENT ON FUNCTION cleanup_inactive_data(INTEGER) IS 'Removes old inactive records to free up space';
COMMENT ON FUNCTION rebuild_performance_indexes() IS 'Rebuilds indexes and updates statistics for better performance';

-- Success message
SELECT 'ESSENTIAL FUNCTIONS SETUP COMPLETE!' as status;
