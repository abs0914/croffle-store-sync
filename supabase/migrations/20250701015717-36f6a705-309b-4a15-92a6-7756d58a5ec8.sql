
-- Add location_type to recipe_template_ingredients for location-based ingredient variations
ALTER TABLE recipe_template_ingredients 
ADD COLUMN location_type TEXT DEFAULT 'all';

-- Add check constraint for location_type
ALTER TABLE recipe_template_ingredients 
ADD CONSTRAINT check_location_type 
CHECK (location_type IN ('all', 'inside_cebu', 'outside_cebu'));

-- Create index for performance
CREATE INDEX idx_recipe_template_ingredients_location ON recipe_template_ingredients(recipe_template_id, location_type);

-- Update existing records to use 'all' as default (backward compatibility)
UPDATE recipe_template_ingredients 
SET location_type = 'all' 
WHERE location_type IS NULL;
