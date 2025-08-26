-- Create enum for ingredient group selection types
CREATE TYPE ingredient_group_selection_type AS ENUM ('required_one', 'optional_one', 'multiple');

-- Add ingredient group columns to recipe_template_ingredients
ALTER TABLE recipe_template_ingredients 
ADD COLUMN ingredient_group_id UUID,
ADD COLUMN ingredient_group_name TEXT,
ADD COLUMN is_optional BOOLEAN DEFAULT false,
ADD COLUMN group_selection_type ingredient_group_selection_type;

-- Create index for better performance when querying by group
CREATE INDEX idx_recipe_template_ingredients_group_id ON recipe_template_ingredients(ingredient_group_id) WHERE ingredient_group_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN recipe_template_ingredients.ingredient_group_id IS 'Links ingredients that belong to the same choice group (e.g., "Choose 1 Sauce")';
COMMENT ON COLUMN recipe_template_ingredients.ingredient_group_name IS 'Display name for the ingredient group shown to users';
COMMENT ON COLUMN recipe_template_ingredients.is_optional IS 'Whether this ingredient is optional in the recipe';
COMMENT ON COLUMN recipe_template_ingredients.group_selection_type IS 'Defines how many ingredients can be selected from this group';