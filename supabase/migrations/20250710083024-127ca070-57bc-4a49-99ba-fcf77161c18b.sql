-- Step 1: Clean up malformed ingredient data in all recipe templates
UPDATE recipe_template_ingredients 
SET ingredient_name = 'REGULAR CROISSANT'
WHERE ingredient_name LIKE '%{%ingredient_name%' 
  AND ingredient_name LIKE '%REGULAR CROISSANT%';

-- Step 2: Add a deployment error tracking table for better monitoring
CREATE TABLE IF NOT EXISTS recipe_deployment_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES recipe_templates(id),
  store_id UUID REFERENCES stores(id),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  ingredient_name TEXT,
  suggested_solution TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on deployment errors table
ALTER TABLE recipe_deployment_errors ENABLE ROW LEVEL SECURITY;

-- Policy for deployment error access
CREATE POLICY "Users can view deployment errors for their stores" 
ON recipe_deployment_errors 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
  )
);

CREATE POLICY "System can insert deployment errors" 
ON recipe_deployment_errors 
FOR INSERT 
WITH CHECK (true);

-- Step 3: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_deployment_errors_template_id 
ON recipe_deployment_errors(template_id);

CREATE INDEX IF NOT EXISTS idx_recipe_deployment_errors_store_id 
ON recipe_deployment_errors(store_id);

-- Step 4: Ensure recipes table has proper constraints
ALTER TABLE recipes 
ADD CONSTRAINT unique_recipe_per_store_template 
UNIQUE (store_id, template_id);

-- Step 5: Add comment for documentation
COMMENT ON TABLE recipe_deployment_errors IS 'Tracks errors that occur during recipe template deployment to help with debugging and monitoring';