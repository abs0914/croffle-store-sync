-- Reset all recipe and inventory related tables for fresh start
-- Clear tables in correct order to respect foreign key constraints

-- Clear product catalog first
DELETE FROM product_catalog;

-- Clear recipe-related tables
DELETE FROM recipe_ingredients;
DELETE FROM recipe_ingredient_mappings;
DELETE FROM recipes;

-- Clear inventory and stock
DELETE FROM inventory_movements;
DELETE FROM inventory_stock;

-- Clear recipe templates and ingredients
DELETE FROM recipe_template_ingredients;
DELETE FROM recipe_templates;

-- Clear any existing products that might conflict
DELETE FROM products WHERE recipe_id IS NOT NULL;

-- Reset sequences if needed
SELECT setval(pg_get_serial_sequence('recipe_templates', 'id'), 1, false);

-- Log the reset
INSERT INTO cleanup_log (table_name, action, details, created_at)
VALUES 
  ('all_recipe_tables', 'full_reset', '{"reason": "unit_mismatch_fix", "cleared_tables": ["product_catalog", "recipe_ingredients", "recipe_ingredient_mappings", "recipes", "inventory_movements", "inventory_stock", "recipe_template_ingredients", "recipe_templates", "products"]}', NOW());