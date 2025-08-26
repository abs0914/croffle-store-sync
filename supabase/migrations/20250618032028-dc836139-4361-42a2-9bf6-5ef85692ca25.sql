
-- Step 1: Remove Recipe Template Ingredients (relationships between templates and commissary items)
DELETE FROM recipe_template_ingredients;

-- Step 2: Remove Recipe Templates
DELETE FROM recipe_templates;

-- Step 3: Remove Deployed Recipe Ingredients and Recipes
DELETE FROM recipe_ingredients;
DELETE FROM recipes;

-- Step 4: Remove Commissary Inventory
DELETE FROM commissary_inventory;

-- Step 5: Verification queries to confirm clean state
SELECT 
  (SELECT COUNT(*) FROM commissary_inventory) as commissary_count,
  (SELECT COUNT(*) FROM recipe_templates) as recipe_templates_count,
  (SELECT COUNT(*) FROM recipe_template_ingredients) as recipe_ingredients_count,
  (SELECT COUNT(*) FROM recipes) as deployed_recipes_count,
  (SELECT COUNT(*) FROM recipe_ingredients) as recipe_ingredients_deployed_count;
