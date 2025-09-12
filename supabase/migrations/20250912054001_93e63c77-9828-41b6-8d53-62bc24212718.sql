-- Fix critical security issues: Enable RLS and add policies for inventory_mapping_audit table

-- Enable RLS on the new audit table
ALTER TABLE inventory_mapping_audit ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for inventory_mapping_audit
CREATE POLICY "Admins can manage inventory mapping audit" 
ON inventory_mapping_audit 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM app_users 
    WHERE user_id = auth.uid() 
    AND role = ANY(ARRAY['admin'::app_role, 'owner'::app_role])
  )
);

CREATE POLICY "Users can view mapping audit for their stores" 
ON inventory_mapping_audit 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM recipes r
    JOIN app_users au ON (
      au.user_id = auth.uid() 
      AND (
        au.role = ANY(ARRAY['admin'::app_role, 'owner'::app_role]) 
        OR r.store_id = ANY(au.store_ids)
      )
    )
    WHERE r.id = inventory_mapping_audit.recipe_id
  )
);