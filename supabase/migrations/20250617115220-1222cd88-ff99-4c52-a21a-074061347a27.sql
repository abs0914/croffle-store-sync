
-- Add approval workflow fields to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS category_name TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create recipe templates table for centralized recipe management
CREATE TABLE IF NOT EXISTS recipe_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  yield_quantity NUMERIC NOT NULL DEFAULT 1,
  serving_size NUMERIC DEFAULT 1,
  category_name TEXT,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create recipe template ingredients table
CREATE TABLE IF NOT EXISTS recipe_template_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_template_id UUID NOT NULL REFERENCES recipe_templates(id) ON DELETE CASCADE,
  commissary_item_id UUID NOT NULL REFERENCES commissary_inventory(id),
  commissary_item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create function to automatically create product when recipe is approved
CREATE OR REPLACE FUNCTION create_product_from_approved_recipe()
RETURNS TRIGGER AS $$
DECLARE
  new_product_id UUID;
  recipe_cost NUMERIC;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    
    -- Calculate recipe cost
    SELECT COALESCE(SUM(ri.quantity * COALESCE(ri.cost_per_unit, ci.unit_cost, 0)), 0)
    INTO recipe_cost
    FROM recipe_ingredients ri
    LEFT JOIN commissary_inventory ci ON ri.commissary_item_id = ci.id
    WHERE ri.recipe_id = NEW.id;
    
    -- Create the product
    INSERT INTO products (
      name,
      description,
      sku,
      price,
      cost,
      stock_quantity,
      store_id,
      is_active
    ) VALUES (
      NEW.name,
      NEW.description,
      'RCP-' || UPPER(REPLACE(NEW.name, ' ', '-')) || '-' || SUBSTRING(NEW.store_id::text, 1, 8),
      recipe_cost * 1.5, -- 50% markup as default
      recipe_cost,
      0, -- Initial stock quantity
      NEW.store_id,
      true
    ) RETURNING id INTO new_product_id;
    
    -- Update the recipe with the product_id
    UPDATE recipes 
    SET product_id = new_product_id 
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic product creation
DROP TRIGGER IF EXISTS trigger_create_product_from_approved_recipe ON recipes;
CREATE TRIGGER trigger_create_product_from_approved_recipe
  AFTER UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION create_product_from_approved_recipe();

-- Enable RLS on new tables
ALTER TABLE recipe_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_template_ingredients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recipe templates
CREATE POLICY "Admin and owners can manage recipe templates" ON recipe_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- Create RLS policies for recipe template ingredients
CREATE POLICY "Admin and owners can manage recipe template ingredients" ON recipe_template_ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM app_users 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );
