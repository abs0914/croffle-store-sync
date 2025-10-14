-- Add RLS policies for new tables created in Phase 5

-- Enable RLS on mix_match_ingredient_deductions
ALTER TABLE mix_match_ingredient_deductions ENABLE ROW LEVEL SECURITY;

-- Admins and owners can manage mix & match deductions
CREATE POLICY "Admins can manage mix match deductions"
ON mix_match_ingredient_deductions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.role IN ('admin', 'owner')
      AND au.is_active = true
  )
);

-- Users can view mix & match deductions for their stores
CREATE POLICY "Users can view mix match deductions for their stores"
ON mix_match_ingredient_deductions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND (
        au.role IN ('admin', 'owner')
        OR mix_match_ingredient_deductions.store_id = ANY(au.store_ids)
      )
  )
);

-- Fix function search paths
ALTER FUNCTION populate_mix_match_deductions() SET search_path = public, pg_temp;
ALTER FUNCTION refresh_product_availability() SET search_path = public, pg_temp;

COMMENT ON POLICY "Admins can manage mix match deductions" ON mix_match_ingredient_deductions IS 'Allows admins and owners to create, update, and delete mix & match deduction rules';
COMMENT ON POLICY "Users can view mix match deductions for their stores" ON mix_match_ingredient_deductions IS 'Allows users to view mix & match deductions for stores they have access to';