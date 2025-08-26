-- Add choice group support to recipe templates and ingredients

-- Add choice group fields to recipe_template_ingredients
ALTER TABLE recipe_template_ingredients 
ADD COLUMN choice_group_name TEXT,
ADD COLUMN choice_group_type TEXT DEFAULT 'required' CHECK (choice_group_type IN ('required', 'optional', 'multiple')),
ADD COLUMN selection_min INTEGER DEFAULT 0,
ADD COLUMN selection_max INTEGER DEFAULT 1,
ADD COLUMN is_default_selection BOOLEAN DEFAULT false,
ADD COLUMN choice_order INTEGER DEFAULT 0;

-- Add choice configuration to recipe templates
ALTER TABLE recipe_templates 
ADD COLUMN has_choice_groups BOOLEAN DEFAULT false,
ADD COLUMN base_price_includes TEXT, -- Description of what base price includes
ADD COLUMN choice_configuration JSONB DEFAULT '{}'; -- Store complex choice rules

-- Create index for better performance on choice group queries
CREATE INDEX idx_recipe_template_ingredients_choice_group 
ON recipe_template_ingredients(recipe_template_id, choice_group_name);

-- Create choice groups table for better organization
CREATE TABLE recipe_choice_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_template_id UUID NOT NULL REFERENCES recipe_templates(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  group_type TEXT NOT NULL DEFAULT 'required' CHECK (group_type IN ('required', 'optional', 'multiple')),
  selection_min INTEGER DEFAULT 1,
  selection_max INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(recipe_template_id, group_name)
);

-- Create index for choice groups
CREATE INDEX idx_recipe_choice_groups_template ON recipe_choice_groups(recipe_template_id);

-- Add RLS policies for choice groups
ALTER TABLE recipe_choice_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and owners can manage choice groups"
ON recipe_choice_groups FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND is_active = true
  )
);

CREATE POLICY "Users can view active choice groups"
ON recipe_choice_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipe_templates rt
    WHERE rt.id = recipe_choice_groups.recipe_template_id
    AND rt.is_active = true
  )
);

-- Add comments for documentation
COMMENT ON COLUMN recipe_template_ingredients.choice_group_name IS 'Name of the choice group this ingredient belongs to (e.g., "sauce_selection", "topping_selection")';
COMMENT ON COLUMN recipe_template_ingredients.choice_group_type IS 'Type of choice group: required (must choose), optional (can choose), multiple (can choose many)';
COMMENT ON COLUMN recipe_template_ingredients.selection_min IS 'Minimum number of selections required from this choice group';
COMMENT ON COLUMN recipe_template_ingredients.selection_max IS 'Maximum number of selections allowed from this choice group';
COMMENT ON COLUMN recipe_template_ingredients.is_default_selection IS 'Whether this ingredient is selected by default';
COMMENT ON COLUMN recipe_templates.base_price_includes IS 'Human-readable description of what the base price includes';
COMMENT ON COLUMN recipe_templates.choice_configuration IS 'JSON configuration for complex choice rules and pricing adjustments';