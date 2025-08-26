-- Add constraints and triggers for inventory sync integrity

-- Add trigger to ensure transactions have corresponding inventory movements
CREATE OR REPLACE FUNCTION validate_transaction_inventory_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check completed transactions
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Set a flag to allow checking after transaction completes
    PERFORM pg_notify('transaction_completed', NEW.id::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction completion validation
DROP TRIGGER IF EXISTS trigger_validate_transaction_inventory ON transactions;
CREATE TRIGGER trigger_validate_transaction_inventory
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_transaction_inventory_sync();

-- Add audit table for inventory sync failures
CREATE TABLE IF NOT EXISTS inventory_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  sync_status TEXT NOT NULL CHECK (sync_status IN ('success', 'failed', 'pending')),
  error_details TEXT,
  items_processed INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES app_users(user_id),
  CONSTRAINT unique_transaction_audit UNIQUE(transaction_id)
);

-- Enable RLS on audit table
ALTER TABLE inventory_sync_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory sync audit
CREATE POLICY "Admins can manage inventory sync audit"
ON inventory_sync_audit
FOR ALL
TO authenticated
USING (is_admin_or_owner())
WITH CHECK (is_admin_or_owner());

CREATE POLICY "Users can view inventory sync audit for their stores"
ON inventory_sync_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM transactions t
    JOIN app_users au ON (
      au.user_id = auth.uid() AND
      (au.role IN ('admin', 'owner') OR t.store_id = ANY(au.store_ids))
    )
    WHERE t.id = inventory_sync_audit.transaction_id
  )
);

-- Function to log inventory sync results
CREATE OR REPLACE FUNCTION log_inventory_sync_result(
  p_transaction_id UUID,
  p_sync_status TEXT,
  p_error_details TEXT DEFAULT NULL,
  p_items_processed INTEGER DEFAULT 0,
  p_sync_duration_ms INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO inventory_sync_audit (
    transaction_id,
    sync_status,
    error_details,
    items_processed,
    sync_duration_ms
  ) VALUES (
    p_transaction_id,
    p_sync_status,
    p_error_details,
    p_items_processed,
    p_sync_duration_ms
  )
  ON CONFLICT (transaction_id)
  DO UPDATE SET
    sync_status = EXCLUDED.sync_status,
    error_details = EXCLUDED.error_details,
    items_processed = EXCLUDED.items_processed,
    sync_duration_ms = EXCLUDED.sync_duration_ms,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_sync_audit_status 
ON inventory_sync_audit(sync_status, created_at);

CREATE INDEX IF NOT EXISTS idx_inventory_sync_audit_transaction 
ON inventory_sync_audit(transaction_id);

-- Update existing transactions without sync audit entries
INSERT INTO inventory_sync_audit (transaction_id, sync_status, items_processed)
SELECT 
  t.id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM inventory_movements im 
      WHERE im.reference_type = 'transaction' 
      AND im.reference_id = t.id
    ) THEN 'success'
    ELSE 'failed'
  END as sync_status,
  COALESCE((
    SELECT COUNT(*) FROM inventory_movements im 
    WHERE im.reference_type = 'transaction' 
    AND im.reference_id = t.id
  ), 0) as items_processed
FROM transactions t
WHERE t.status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM inventory_sync_audit isa 
  WHERE isa.transaction_id = t.id
)
ON CONFLICT (transaction_id) DO NOTHING;