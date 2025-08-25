-- Clear existing recipe template data to re-import with better parsing
DELETE FROM recipe_template_ingredients;
DELETE FROM recipe_templates;

-- Reset sequences if needed
ALTER SEQUENCE recipe_templates_id_seq RESTART WITH 1;
ALTER SEQUENCE recipe_template_ingredients_id_seq RESTART WITH 1;