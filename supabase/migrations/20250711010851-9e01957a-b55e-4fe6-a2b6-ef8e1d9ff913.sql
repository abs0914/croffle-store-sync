-- Fix foreign key constraint on recipe_deployments to allow proper deletion
-- Drop the existing constraint
ALTER TABLE recipe_deployments 
DROP CONSTRAINT IF EXISTS recipe_deployments_recipe_id_fkey;

-- Recreate with CASCADE deletion
ALTER TABLE recipe_deployments 
ADD CONSTRAINT recipe_deployments_recipe_id_fkey 
FOREIGN KEY (recipe_id) 
REFERENCES recipes(id) 
ON DELETE CASCADE;

-- Also ensure we have proper indexing
CREATE INDEX IF NOT EXISTS idx_recipe_deployments_recipe_id 
ON recipe_deployments(recipe_id);