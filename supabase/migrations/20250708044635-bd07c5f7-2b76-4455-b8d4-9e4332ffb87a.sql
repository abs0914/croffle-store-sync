-- Add recipe type and combo support to recipe templates and recipes tables
ALTER TABLE recipe_templates ADD COLUMN IF NOT EXISTS recipe_type TEXT DEFAULT 'single';
ALTER TABLE recipe_templates ADD COLUMN IF NOT EXISTS combo_rules JSONB;
ALTER TABLE recipe_templates ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE recipes ADD COLUMN IF NOT EXISTS recipe_type TEXT DEFAULT 'single';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS combo_rules JSONB;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Create component recipes relationship table
CREATE TABLE IF NOT EXISTS recipe_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_recipe_id UUID REFERENCES recipe_templates(id) ON DELETE CASCADE,
  component_recipe_id UUID REFERENCES recipe_templates(id) ON DELETE CASCADE,
  quantity NUMERIC DEFAULT 1,
  is_required BOOLEAN DEFAULT true,
  component_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_templates_type ON recipe_templates(recipe_type);
CREATE INDEX IF NOT EXISTS idx_recipes_type ON recipes(recipe_type);
CREATE INDEX IF NOT EXISTS idx_recipe_components_parent ON recipe_components(parent_recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_components_component ON recipe_components(component_recipe_id);

-- Add RLS policies for recipe_components
ALTER TABLE recipe_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admin and owners can manage recipe components"
ON recipe_components FOR ALL 
USING (is_admin_or_owner());

CREATE POLICY IF NOT EXISTS "Users can view recipe components"
ON recipe_components FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add check constraints for recipe types
ALTER TABLE recipe_templates ADD CONSTRAINT IF NOT EXISTS check_recipe_type 
  CHECK (recipe_type IN ('single', 'combo', 'component'));
  
ALTER TABLE recipes ADD CONSTRAINT IF NOT EXISTS check_recipe_type 
  CHECK (recipe_type IN ('single', 'combo', 'component'));