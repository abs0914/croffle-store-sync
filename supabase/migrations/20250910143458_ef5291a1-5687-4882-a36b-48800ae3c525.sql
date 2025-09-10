-- Deploy Premium recipes to all stores and create inventory mappings
SELECT deploy_and_fix_recipe_templates_to_all_stores();

-- Create inventory mappings for the Premium products
SELECT create_ingredient_inventory_mappings();