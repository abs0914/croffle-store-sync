-- Fix foreign key constraint on recipe_deployment_logs to allow proper deletion
-- Drop the existing constraint
ALTER TABLE recipe_deployment_logs 
DROP CONSTRAINT IF EXISTS recipe_deployment_logs_recipe_id_fkey;

-- Recreate with CASCADE deletion  
ALTER TABLE recipe_deployment_logs 
ADD CONSTRAINT recipe_deployment_logs_recipe_id_fkey 
FOREIGN KEY (recipe_id) 
REFERENCES recipes(id) 
ON DELETE CASCADE;

-- Also ensure we have proper indexing
CREATE INDEX IF NOT EXISTS idx_recipe_deployment_logs_recipe_id 
ON recipe_deployment_logs(recipe_id);