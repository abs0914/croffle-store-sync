-- Fix foreign key constraint to allow proper deletion of recipe templates
-- Drop the existing constraint
ALTER TABLE recipe_deployment_logs 
DROP CONSTRAINT IF EXISTS recipe_deployment_logs_template_id_fkey;

-- Recreate with CASCADE deletion
ALTER TABLE recipe_deployment_logs 
ADD CONSTRAINT recipe_deployment_logs_template_id_fkey 
FOREIGN KEY (template_id) 
REFERENCES recipe_templates(id) 
ON DELETE CASCADE;

-- Also ensure we have proper indexing
CREATE INDEX IF NOT EXISTS idx_recipe_deployment_logs_template_id 
ON recipe_deployment_logs(template_id);