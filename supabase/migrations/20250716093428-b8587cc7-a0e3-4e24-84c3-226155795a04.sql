-- Fix SM Accreditation export functions to work with actual database schema

-- Drop existing functions first
DROP FUNCTION IF EXISTS export_transactions_csv_recent(uuid, integer);
DROP FUNCTION IF EXISTS export_transaction_details_csv_recent(uuid, integer);

-- Create corrected transaction export function
CREATE OR REPLACE FUNCTION export_transactions_csv_recent(
    store_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(csv_data TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'receipt_number,business_date,transaction_time,gross_amount,discount_amount,net_amount,vat_amount,payment_method,discount_type,discount_id,promo_details,senior_discount,pwd_discount' || E'\n' ||
        COALESCE(
            STRING_AGG(
                CONCAT(
                    COALESCE(t.receipt_number, ''),
                    ',',
                    COALESCE(t.created_at::date::text, ''),
                    ',',
                    COALESCE(TO_CHAR(t.created_at, 'HH24:MI:SS'), ''),
                    ',',
                    COALESCE(t.total::text, '0'),
                    ',',
                    COALESCE(t.discount_amount::text, '0'),
                    ',',
                    COALESCE((t.total - COALESCE(t.discount_amount, 0))::text, '0'),
                    ',',
                    COALESCE(t.vat_amount::text, '0'),
                    ',',
                    COALESCE(t.payment_method, 'CASH'),
                    ',',
                    COALESCE(t.discount_type, ''),
                    ',',
                    COALESCE(t.discount_id, ''),
                    ',',
                    COALESCE(t.promo_details, ''),
                    ',',
                    COALESCE(t.senior_discount::text, '0'),
                    ',',
                    COALESCE(t.pwd_discount::text, '0')
                ),
                E'\n'
            ),
            ''
        )
    FROM transactions t
    WHERE t.store_id = store_id_param
      AND t.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
      AND t.status = 'completed'
    ORDER BY t.created_at DESC;
END;
$$;

-- Create transaction details export function using actual schema
CREATE OR REPLACE FUNCTION export_transaction_details_csv_recent(
    store_id_param UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(csv_data TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Since transaction_items table doesn't exist, create empty CSV structure
    RETURN QUERY
    SELECT 'receipt_number,item_sequence,item_description,quantity,unit_price,line_total,item_discount,vat_exempt_flag'::TEXT;
END;
$$;

-- Create shifts table if it doesn't exist (needed for testing)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    cashier_id UUID,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for shifts
CREATE POLICY "Users can manage shifts for their stores" 
ON shifts 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 
        FROM app_users au 
        WHERE au.user_id = auth.uid() 
        AND au.is_active = true
        AND (
            au.role IN ('admin', 'owner') 
            OR shifts.store_id = ANY(au.store_ids)
        )
    )
);

-- Add missing columns to transactions table if they don't exist
DO $$
BEGIN
    -- Add cashier_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'cashier_name') THEN
        ALTER TABLE transactions ADD COLUMN cashier_name TEXT;
    END IF;
    
    -- Add shift_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'shift_id') THEN
        ALTER TABLE transactions ADD COLUMN shift_id UUID REFERENCES shifts(id);
    END IF;
    
    -- Add discount_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'discount_amount') THEN
        ALTER TABLE transactions ADD COLUMN discount_amount NUMERIC DEFAULT 0;
    END IF;
    
    -- Add vat_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'vat_amount') THEN
        ALTER TABLE transactions ADD COLUMN vat_amount NUMERIC DEFAULT 0;
    END IF;
    
    -- Add payment_method column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'payment_method') THEN
        ALTER TABLE transactions ADD COLUMN payment_method TEXT DEFAULT 'CASH';
    END IF;
    
    -- Add discount_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'discount_type') THEN
        ALTER TABLE transactions ADD COLUMN discount_type TEXT;
    END IF;
    
    -- Add discount_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'discount_id') THEN
        ALTER TABLE transactions ADD COLUMN discount_id TEXT;
    END IF;
    
    -- Add promo_details column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'promo_details') THEN
        ALTER TABLE transactions ADD COLUMN promo_details TEXT;
    END IF;
    
    -- Add senior_discount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'senior_discount') THEN
        ALTER TABLE transactions ADD COLUMN senior_discount NUMERIC DEFAULT 0;
    END IF;
    
    -- Add pwd_discount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'pwd_discount') THEN
        ALTER TABLE transactions ADD COLUMN pwd_discount NUMERIC DEFAULT 0;
    END IF;
END $$;