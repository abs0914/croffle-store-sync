-- Fix store_metrics RLS policy to allow system updates from transaction trigger
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON store_metrics;

-- Create proper RLS policies for store_metrics
CREATE POLICY "Users can view store metrics for their stores" 
ON store_metrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.user_id = auth.uid() 
    AND (
      au.role IN ('admin', 'owner') 
      OR store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "System can manage store metrics" 
ON store_metrics 
FOR ALL 
USING (true);