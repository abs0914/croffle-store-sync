-- Comprehensive reset handling all foreign key dependencies
-- Clear all tables that reference inventory_stock and recipe-related data

-- Clear purchase order items first (references inventory_stock)
DELETE FROM purchase_order_items;

-- Clear product catalog first
DELETE FROM product_catalog;

-- Clear recipe-related tables (child tables first)
DELETE FROM recipe_ingredients;
DELETE FROM recipe_ingredient_mappings;
DELETE FROM recipes;

-- Clear recipe template ingredients BEFORE inventory stock
DELETE FROM recipe_template_ingredients;

-- Clear inventory and stock
DELETE FROM inventory_movements;
DELETE FROM inventory_stock;

-- Clear recipe templates
DELETE FROM recipe_templates;

-- Clear any existing products that might conflict
DELETE FROM products WHERE recipe_id IS NOT NULL;

-- Log the reset
INSERT INTO cleanup_log (table_name, action, details, created_at)
VALUES 
  ('all_tables_full_reset', 'comprehensive_reset', '{"reason": "unit_mismatch_fix_with_dependencies", "cleared_tables": ["purchase_order_items", "product_catalog", "recipe_ingredients", "recipe_ingredient_mappings", "recipes", "recipe_template_ingredients", "inventory_movements", "inventory_stock", "recipe_templates", "products"]}', NOW());