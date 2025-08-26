
-- Comprehensive Data Reset: Remove all recipe, commissary, and order management data
-- This script maintains table structures while clearing all data (corrected version)

-- Step 1: Clear recipe-related data (in dependency order)
DELETE FROM recipe_usage_log;
DELETE FROM recipe_ingredients;
DELETE FROM recipe_template_ingredients;
DELETE FROM recipes;
DELETE FROM recipe_templates;

-- Step 2: Clear conversion and inventory conversion data
DELETE FROM conversion_ingredients;
DELETE FROM conversion_recipe_ingredients;
DELETE FROM inventory_conversions;
DELETE FROM conversion_recipes;

-- Step 3: Clear order management data
DELETE FROM grn_items;
DELETE FROM goods_received_notes;
DELETE FROM delivery_orders;
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM damaged_goods;
DELETE FROM damage_audit_trail;
DELETE FROM order_audit_trail;
DELETE FROM order_status_history;
DELETE FROM order_items;
DELETE FROM orders;

-- Step 4: Clear commissary data
DELETE FROM commissary_purchases;
DELETE FROM commissary_restock_fulfillments;
DELETE FROM commissary_restock_requests;
DELETE FROM commissary_inventory;

-- Step 5: Clear stock and inventory management data
DELETE FROM stock_order_items;
DELETE FROM stock_orders;
DELETE FROM stock_transactions;
DELETE FROM inventory_movements;
DELETE FROM inventory_transactions;
DELETE FROM store_inventory_alerts;

-- Step 6: Clear product-related data that depends on recipes
DELETE FROM product_ingredients;
DELETE FROM product_catalog_variations;
DELETE FROM product_catalog;

-- Step 7: Clear location-based data
DELETE FROM location_pricing;
DELETE FROM regional_suppliers;

-- Verification queries to confirm clean state
SELECT 
  'recipe_templates' as table_name, COUNT(*) as record_count FROM recipe_templates
UNION ALL
SELECT 
  'recipes' as table_name, COUNT(*) as record_count FROM recipes
UNION ALL
SELECT 
  'recipe_ingredients' as table_name, COUNT(*) as record_count FROM recipe_ingredients
UNION ALL
SELECT 
  'recipe_template_ingredients' as table_name, COUNT(*) as record_count FROM recipe_template_ingredients
UNION ALL
SELECT 
  'commissary_inventory' as table_name, COUNT(*) as record_count FROM commissary_inventory
UNION ALL
SELECT 
  'commissary_purchases' as table_name, COUNT(*) as record_count FROM commissary_purchases
UNION ALL
SELECT 
  'purchase_orders' as table_name, COUNT(*) as record_count FROM purchase_orders
UNION ALL
SELECT 
  'purchase_order_items' as table_name, COUNT(*) as record_count FROM purchase_order_items
UNION ALL
SELECT 
  'delivery_orders' as table_name, COUNT(*) as record_count FROM delivery_orders
UNION ALL
SELECT 
  'goods_received_notes' as table_name, COUNT(*) as record_count FROM goods_received_notes
UNION ALL
SELECT 
  'inventory_conversions' as table_name, COUNT(*) as record_count FROM inventory_conversions
UNION ALL
SELECT 
  'conversion_recipes' as table_name, COUNT(*) as record_count FROM conversion_recipes
UNION ALL
SELECT 
  'stock_orders' as table_name, COUNT(*) as record_count FROM stock_orders
UNION ALL
SELECT 
  'product_catalog' as table_name, COUNT(*) as record_count FROM product_catalog
ORDER BY table_name;
