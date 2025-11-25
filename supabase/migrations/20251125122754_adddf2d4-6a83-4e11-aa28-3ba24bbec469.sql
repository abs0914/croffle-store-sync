-- =====================================================
-- PHASE 1: INVENTORY DEDUCTION RELIABILITY REFACTOR
-- Database Schema Enhancements (FINAL - WITH DEDUPLICATION)
-- =====================================================

-- 1.1: Add version column for optimistic locking (prevents race conditions)
ALTER TABLE inventory_stock 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- Create trigger to auto-increment version on every update
CREATE OR REPLACE FUNCTION increment_inventory_version()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

-- Only create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'inventory_stock_version_trigger'
  ) THEN
    CREATE TRIGGER inventory_stock_version_trigger
    BEFORE UPDATE ON inventory_stock
    FOR EACH ROW
    EXECUTE FUNCTION increment_inventory_version();
  END IF;
END $$;

-- 1.2: Create idempotency protection table
CREATE TABLE IF NOT EXISTS inventory_deduction_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  deduction_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) 
    REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_idempotency_key 
ON inventory_deduction_idempotency(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_idempotency_transaction 
ON inventory_deduction_idempotency(transaction_id);

-- 1.3: Fix conversion_mappings - Add store isolation and de-duplicate

-- First, clean up orphaned records that reference deleted inventory_stock
DELETE FROM conversion_mappings
WHERE inventory_stock_id NOT IN (SELECT id FROM inventory_stock);

-- Add store_id column (nullable initially)
ALTER TABLE conversion_mappings 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Update existing mappings to set store_id from inventory_stock
UPDATE conversion_mappings cm
SET store_id = ist.store_id
FROM inventory_stock ist
WHERE cm.inventory_stock_id = ist.id
  AND cm.store_id IS NULL;

-- DE-DUPLICATE: Remove duplicate conversion_mappings, keeping the most recent one
DELETE FROM conversion_mappings
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY recipe_ingredient_name, recipe_ingredient_unit, store_id, inventory_stock_id 
        ORDER BY created_at DESC, id DESC
      ) as rn
    FROM conversion_mappings
    WHERE is_active = true
  ) sub
  WHERE rn > 1
);

-- Make store_id NOT NULL after backfilling
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversion_mappings' 
    AND column_name = 'store_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE conversion_mappings 
    ALTER COLUMN store_id SET NOT NULL;
  END IF;
END $$;

-- Create unique index to prevent duplicate mappings per store
DROP INDEX IF EXISTS idx_conversion_unique_per_store;
CREATE UNIQUE INDEX idx_conversion_unique_per_store 
ON conversion_mappings(recipe_ingredient_name, recipe_ingredient_unit, store_id, inventory_stock_id)
WHERE is_active = true;

-- Add index for fast store-filtered lookups
CREATE INDEX IF NOT EXISTS idx_conversion_store_lookup 
ON conversion_mappings(store_id, recipe_ingredient_name, recipe_ingredient_unit)
WHERE is_active = true;

-- 1.4: Create offline transaction queue table
CREATE TABLE IF NOT EXISTS offline_transaction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_data JSONB NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  stock_validation_errors JSONB,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_status 
ON offline_transaction_queue(status, store_id);

CREATE INDEX IF NOT EXISTS idx_offline_queue_created 
ON offline_transaction_queue(created_at);

-- 1.5: Create compensation log for rollbacks
CREATE TABLE IF NOT EXISTS inventory_compensation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  inventory_stock_id UUID NOT NULL REFERENCES inventory_stock(id) ON DELETE CASCADE,
  original_quantity NUMERIC(10,2) NOT NULL,
  deducted_quantity NUMERIC(10,2) NOT NULL,
  compensated_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compensation_transaction 
ON inventory_compensation_log(transaction_id);

CREATE INDEX IF NOT EXISTS idx_compensation_stock 
ON inventory_compensation_log(inventory_stock_id);

-- 1.6: Remove problematic "Mini Croffle Base" product
DELETE FROM product_catalog 
WHERE id = 'b300ecd4-722f-4142-b72d-67421e129edc'
  AND product_name = 'Mini Croffle Base';

-- Remove its orphaned recipe
DELETE FROM recipes
WHERE id = '81f78b9b-c28d-4b0a-8300-5c64bc949466'
  AND name = 'Mini Croffle Base';

-- Enable RLS on new tables
ALTER TABLE inventory_deduction_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_transaction_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_compensation_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_deduction_idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_deduction_idempotency' 
    AND policyname = 'Users can view own store idempotency records'
  ) THEN
    CREATE POLICY "Users can view own store idempotency records"
    ON inventory_deduction_idempotency FOR SELECT
    USING (
      transaction_id IN (
        SELECT id FROM transactions WHERE store_id IN (
          SELECT unnest(store_ids) FROM app_users WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_deduction_idempotency' 
    AND policyname = 'System can insert idempotency records'
  ) THEN
    CREATE POLICY "System can insert idempotency records"
    ON inventory_deduction_idempotency FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Create RLS policies for offline_transaction_queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offline_transaction_queue' 
    AND policyname = 'Users can view own store queue'
  ) THEN
    CREATE POLICY "Users can view own store queue"
    ON offline_transaction_queue FOR SELECT
    USING (
      store_id IN (
        SELECT unnest(store_ids) FROM app_users WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offline_transaction_queue' 
    AND policyname = 'Users can insert to own store queue'
  ) THEN
    CREATE POLICY "Users can insert to own store queue"
    ON offline_transaction_queue FOR INSERT
    WITH CHECK (
      store_id IN (
        SELECT unnest(store_ids) FROM app_users WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'offline_transaction_queue' 
    AND policyname = 'Admins can update queue status'
  ) THEN
    CREATE POLICY "Admins can update queue status"
    ON offline_transaction_queue FOR UPDATE
    USING (
      store_id IN (
        SELECT unnest(store_ids) FROM app_users 
        WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin')
      )
    );
  END IF;
END $$;

-- Create RLS policies for inventory_compensation_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_compensation_log' 
    AND policyname = 'Users can view own store compensation logs'
  ) THEN
    CREATE POLICY "Users can view own store compensation logs"
    ON inventory_compensation_log FOR SELECT
    USING (
      transaction_id IN (
        SELECT id FROM transactions WHERE store_id IN (
          SELECT unnest(store_ids) FROM app_users WHERE user_id = auth.uid()
        )
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory_compensation_log' 
    AND policyname = 'System can insert compensation logs'
  ) THEN
    CREATE POLICY "System can insert compensation logs"
    ON inventory_compensation_log FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE inventory_deduction_idempotency IS 
'Prevents duplicate inventory deductions when transactions are retried';

COMMENT ON TABLE offline_transaction_queue IS 
'Queues offline transactions requiring manual approval due to stock insufficiency';

COMMENT ON TABLE inventory_compensation_log IS 
'Tracks inventory adjustments for rollback and audit purposes';

COMMENT ON COLUMN inventory_stock.version IS 
'Optimistic locking version number - increments on every update to prevent race conditions';

COMMENT ON COLUMN conversion_mappings.store_id IS 
'Store isolation - prevents cross-store inventory deduction';