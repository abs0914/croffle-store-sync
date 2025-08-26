-- Step 1: Clean up malformed ingredient data (run again to ensure all are fixed)
UPDATE recipe_template_ingredients 
SET ingredient_name = 'REGULAR CROISSANT'
WHERE ingredient_name LIKE '%{%ingredient_name%' 
  AND ingredient_name LIKE '%REGULAR CROISSANT%';

-- Step 2: Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view deployment errors for their stores" ON recipe_deployment_errors;
DROP POLICY IF EXISTS "System can insert deployment errors" ON recipe_deployment_errors;

-- Recreate the policies
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

-- Step 3: Add the unique constraint safely
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_recipe_per_store_template'
  ) THEN
    ALTER TABLE recipes 
    ADD CONSTRAINT unique_recipe_per_store_template 
    UNIQUE (store_id, template_id);
  END IF;
END $$;