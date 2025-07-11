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

-- Enable RLS on recipe_components
ALTER TABLE recipe_components ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for recipe_components
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipe_components' 
    AND policyname = 'Admin and owners can manage recipe components'
  ) THEN
    CREATE POLICY "Admin and owners can manage recipe components"
    ON recipe_components FOR ALL 
    USING (is_admin_or_owner());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipe_components' 
    AND policyname = 'Users can view recipe components'
  ) THEN
    CREATE POLICY "Users can view recipe components"
    ON recipe_components FOR SELECT 
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Add check constraints for recipe types (using different approach)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'recipe_templates' 
    AND constraint_name = 'check_recipe_type'
  ) THEN
    ALTER TABLE recipe_templates ADD CONSTRAINT check_recipe_type 
      CHECK (recipe_type IN ('single', 'combo', 'component'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'recipes' 
    AND constraint_name = 'check_recipe_type'
  ) THEN
    ALTER TABLE recipes ADD CONSTRAINT check_recipe_type 
      CHECK (recipe_type IN ('single', 'combo', 'component'));
  END IF;
END $$;