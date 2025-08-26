
-- Add template_id column to recipes table to link back to the original template
ALTER TABLE recipes 
ADD COLUMN template_id uuid REFERENCES recipe_templates(id);

-- Add index for better performance
CREATE INDEX idx_recipes_template_id ON recipes(template_id);

-- Add comment for documentation
COMMENT ON COLUMN recipes.template_id IS 'Links deployed recipe back to its original template';
