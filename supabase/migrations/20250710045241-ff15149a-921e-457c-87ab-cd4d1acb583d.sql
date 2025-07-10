
-- Phase 1: Core Recipe Upload and Deployment System Enhancements

-- Add template tracking and pricing fields to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES recipe_templates(id),
ADD COLUMN IF NOT EXISTS suggested_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS deployment_notes text,
ADD COLUMN IF NOT EXISTS last_cost_update timestamp with time zone DEFAULT now();

-- Add deployment tracking table
CREATE TABLE IF NOT EXISTS recipe_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES recipe_templates(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  recipe_id uuid NOT NULL REFERENCES recipes(id),
  deployed_by uuid NOT NULL,
  deployment_status text NOT NULL DEFAULT 'active',
  deployment_options jsonb DEFAULT '{}',
  cost_snapshot numeric DEFAULT 0,
  price_snapshot numeric DEFAULT 0,
  deployment_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add ingredient substitution mappings
CREATE TABLE IF NOT EXISTS recipe_ingredient_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES recipe_templates(id),
  original_ingredient_name text NOT NULL,
  substitute_ingredient_name text NOT NULL,
  conversion_factor numeric DEFAULT 1.0,
  store_ids uuid[] DEFAULT '{}',
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add store-specific pricing profiles
CREATE TABLE IF NOT EXISTS store_pricing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  profile_name text NOT NULL,
  base_markup_percentage numeric DEFAULT 50.0,
  category_markups jsonb DEFAULT '{}',
  ingredient_cost_adjustments jsonb DEFAULT '{}',
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(store_id, profile_name)
);

-- Add deployment error logs
CREATE TABLE IF NOT EXISTS recipe_deployment_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id uuid REFERENCES recipe_deployments(id),
  template_id uuid NOT NULL REFERENCES recipe_templates(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_deployments_template_store ON recipe_deployments(template_id, store_id);
CREATE INDEX IF NOT EXISTS idx_recipe_deployments_status ON recipe_deployments(deployment_status);
CREATE INDEX IF NOT EXISTS idx_ingredient_substitutions_template ON recipe_ingredient_substitutions(template_id);
CREATE INDEX IF NOT EXISTS idx_store_pricing_profiles_store ON store_pricing_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_deployment_errors_template_store ON recipe_deployment_errors(template_id, store_id);

-- Update recipes table to link with templates for existing recipes
UPDATE recipes 
SET template_id = (
  SELECT rt.id 
  FROM recipe_templates rt 
  WHERE rt.name = recipes.name 
  AND rt.is_active = true 
  LIMIT 1
)
WHERE template_id IS NULL 
AND EXISTS (
  SELECT 1 
  FROM recipe_templates rt 
  WHERE rt.name = recipes.name 
  AND rt.is_active = true
);

-- Add RLS policies
ALTER TABLE recipe_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredient_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_pricing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_deployment_errors ENABLE ROW LEVEL SECURITY;

-- Policies for recipe_deployments
CREATE POLICY "Users can view deployments for their stores" ON recipe_deployments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    )
  );

CREATE POLICY "Admin and owners can manage deployments" ON recipe_deployments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role IN ('admin', 'owner')
    )
  );

-- Policies for ingredient substitutions
CREATE POLICY "Users can view substitutions" ON recipe_ingredient_substitutions
  FOR SELECT USING (true);

CREATE POLICY "Admin and owners can manage substitutions" ON recipe_ingredient_substitutions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role IN ('admin', 'owner')
    )
  );

-- Policies for pricing profiles
CREATE POLICY "Users can view pricing profiles for their stores" ON store_pricing_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    )
  );

CREATE POLICY "Admin and owners can manage pricing profiles" ON store_pricing_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role IN ('admin', 'owner')
    )
  );

-- Policies for deployment errors
CREATE POLICY "Users can view deployment errors for their stores" ON recipe_deployment_errors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.user_id = auth.uid() 
      AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
    )
  );

CREATE POLICY "Admin and owners can manage deployment errors" ON recipe_deployment_errors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.user_id = auth.uid() 
      AND au.role IN ('admin', 'owner')
    )
  );

-- Create function to automatically create deployment records
CREATE OR REPLACE FUNCTION create_recipe_deployment_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create deployment record if recipe has a template_id
  IF NEW.template_id IS NOT NULL THEN
    INSERT INTO recipe_deployments (
      template_id,
      store_id,
      recipe_id,
      deployed_by,
      cost_snapshot,
      price_snapshot,
      deployment_notes
    ) VALUES (
      NEW.template_id,
      NEW.store_id,
      NEW.id,
      COALESCE(NEW.created_by, auth.uid()),
      COALESCE(NEW.total_cost, 0),
      COALESCE(NEW.suggested_price, 0),
      'Auto-created from recipe deployment'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic deployment tracking
DROP TRIGGER IF EXISTS create_deployment_record_trigger ON recipes;
CREATE TRIGGER create_deployment_record_trigger
  AFTER INSERT ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION create_recipe_deployment_record();

-- Add function to calculate suggested pricing with markup profiles
CREATE OR REPLACE FUNCTION calculate_recipe_suggested_price(
  recipe_id_param uuid,
  store_id_param uuid DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  base_cost numeric := 0;
  markup_percentage numeric := 50.0;
  suggested_price numeric := 0;
  pricing_profile record;
BEGIN
  -- Get recipe cost
  SELECT COALESCE(total_cost, 0) INTO base_cost
  FROM recipes 
  WHERE id = recipe_id_param;
  
  -- Get store pricing profile if store_id provided
  IF store_id_param IS NOT NULL THEN
    SELECT * INTO pricing_profile
    FROM store_pricing_profiles 
    WHERE store_id = store_id_param 
    AND is_active = true 
    AND is_default = true
    LIMIT 1;
    
    IF FOUND THEN
      markup_percentage := pricing_profile.base_markup_percentage;
    END IF;
  END IF;
  
  -- Calculate suggested price
  suggested_price := base_cost * (1 + markup_percentage / 100.0);
  
  RETURN ROUND(suggested_price, 2);
END;
$$ LANGUAGE plpgsql;
