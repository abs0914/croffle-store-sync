-- Phase 1: Robinsons-Only Database Schema
-- Add Robinsons Mall accreditation fields to stores table

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS robinsons_tenant_id VARCHAR(10),
ADD COLUMN IF NOT EXISTS robinsons_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS robinsons_sftp_host VARCHAR(255),
ADD COLUMN IF NOT EXISTS robinsons_sftp_port INTEGER DEFAULT 22,
ADD COLUMN IF NOT EXISTS robinsons_sftp_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS robinsons_eod_counter INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS robinsons_store_type VARCHAR(20) DEFAULT 'regular';

-- Create Robinsons transmission log table (separate from SM)
CREATE TABLE IF NOT EXISTS robinsons_transmission_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  transmission_date DATE NOT NULL,
  eod_counter INTEGER NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  record_count INTEGER,
  file_content TEXT, -- 30-line TXT format
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'success', 'failed', 'pending'
  sftp_response TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  transmission_type VARCHAR(20) DEFAULT 'auto', -- 'auto' or 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_robinsons_transmission_store_date 
ON robinsons_transmission_log(store_id, transmission_date);

CREATE INDEX IF NOT EXISTS idx_robinsons_transmission_status 
ON robinsons_transmission_log(status) WHERE status != 'success';

-- Enable RLS
ALTER TABLE robinsons_transmission_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for robinsons_transmission_log
CREATE POLICY "Users can view Robinsons logs for accessible stores"
ON robinsons_transmission_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid()
    AND au.is_active = true
    AND (
      au.role IN ('admin', 'owner')
      OR robinsons_transmission_log.store_id = ANY(au.store_ids)
    )
  )
);

CREATE POLICY "System can insert Robinsons transmission logs"
ON robinsons_transmission_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update Robinsons transmission logs"
ON robinsons_transmission_log FOR UPDATE
USING (true);

-- Add comments for documentation
COMMENT ON TABLE robinsons_transmission_log IS 'Tracks all Robinsons Land Corporation data transmissions (separate from SM system)';
COMMENT ON COLUMN stores.robinsons_tenant_id IS '10-digit Tenant ID provided by Robinsons Land Corporation';
COMMENT ON COLUMN stores.robinsons_store_type IS 'Store type: regular (EOD at 4:00 AM) or 24_7 (EOD at 11:59 PM)';