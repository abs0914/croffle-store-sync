-- Add ingredient grouping fields to support advanced ingredient management
ALTER TABLE recipe_template_ingredients ADD COLUMN IF NOT EXISTS ingredient_group_id TEXT;
ALTER TABLE recipe_template_ingredients ADD COLUMN IF NOT EXISTS ingredient_group_name TEXT;
ALTER TABLE recipe_template_ingredients ADD COLUMN IF NOT EXISTS group_selection_type TEXT CHECK (group_selection_type IN ('required_one', 'optional_one', 'multiple'));
ALTER TABLE recipe_template_ingredients ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false;
ALTER TABLE recipe_template_ingredients ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS ingredient_group_id TEXT;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS ingredient_group_name TEXT;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS group_selection_type TEXT CHECK (group_selection_type IN ('required_one', 'optional_one', 'multiple'));
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false;
ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes for ingredient grouping
CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_group ON recipe_template_ingredients(ingredient_group_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_group ON recipe_ingredients(ingredient_group_id);
CREATE INDEX IF NOT EXISTS idx_recipe_template_ingredients_order ON recipe_template_ingredients(display_order);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_order ON recipe_ingredients(display_order);