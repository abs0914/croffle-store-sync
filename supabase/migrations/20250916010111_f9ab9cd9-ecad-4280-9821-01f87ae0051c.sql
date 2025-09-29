-- Enhanced BIR Configuration and Compliance Tables

-- BIR Store Configuration with proper machine details
CREATE TABLE IF NOT EXISTS public.bir_store_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    business_name VARCHAR(255) NOT NULL,
    business_address TEXT NOT NULL,
    taxpayer_name VARCHAR(255) NOT NULL,
    tin VARCHAR(20) NOT NULL,
    machine_identification_number VARCHAR(50) NOT NULL, -- MIN
    machine_serial_number VARCHAR(50) NOT NULL, -- S/N
    pos_version VARCHAR(20) DEFAULT '1.0',
    permit_number VARCHAR(50),
    date_issued DATE,
    valid_until DATE,
    supplier_name VARCHAR(255),
    supplier_address TEXT,
    supplier_tin VARCHAR(20),
    accreditation_number VARCHAR(50),
    accreditation_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id)
);

-- BIR Reset Counter Management
CREATE TABLE IF NOT EXISTS public.bir_reset_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    terminal_id VARCHAR(20) NOT NULL DEFAULT 'TERMINAL-01',
    reset_counter INTEGER NOT NULL DEFAULT 0,
    last_reset_date TIMESTAMP WITH TIME ZONE,
    last_reset_reason TEXT,
    agt_before_reset NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced BIR Reading Records
CREATE TABLE IF NOT EXISTS public.bir_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    terminal_id VARCHAR(20) NOT NULL DEFAULT 'TERMINAL-01',
    reading_type VARCHAR(10) NOT NULL CHECK (reading_type IN ('X', 'Z')),
    reading_number BIGINT NOT NULL,
    reading_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    shift_id UUID REFERENCES shifts(id),
    
    -- Reset Information
    reset_counter INTEGER NOT NULL DEFAULT 0,
    
    -- Receipt Range
    beginning_si_number VARCHAR(50),
    ending_si_number VARCHAR(50),
    transaction_count INTEGER DEFAULT 0,
    
    -- Sales Breakdown
    gross_sales NUMERIC(15,2) DEFAULT 0,
    vat_sales NUMERIC(15,2) DEFAULT 0,
    vat_amount NUMERIC(15,2) DEFAULT 0,
    vat_exempt_sales NUMERIC(15,2) DEFAULT 0,
    zero_rated_sales NUMERIC(15,2) DEFAULT 0,
    
    -- Discounts
    sc_discount NUMERIC(15,2) DEFAULT 0, -- Senior Citizen
    pwd_discount NUMERIC(15,2) DEFAULT 0, -- PWD
    naac_discount NUMERIC(15,2) DEFAULT 0, -- NAAC
    sp_discount NUMERIC(15,2) DEFAULT 0, -- Solo Parent
    other_discounts NUMERIC(15,2) DEFAULT 0,
    total_discounts NUMERIC(15,2) DEFAULT 0,
    
    -- Net Sales
    net_sales NUMERIC(15,2) DEFAULT 0,
    
    -- Accumulated Totals (for Z-Reading)
    accumulated_gross_sales NUMERIC(15,2) DEFAULT 0,
    accumulated_net_sales NUMERIC(15,2) DEFAULT 0,
    accumulated_vat NUMERIC(15,2) DEFAULT 0,
    
    -- Cash Management (Z-Reading only)
    beginning_cash NUMERIC(15,2),
    cash_sales NUMERIC(15,2),
    cash_payouts NUMERIC(15,2),
    expected_cash NUMERIC(15,2),
    actual_cash NUMERIC(15,2),
    cash_variance NUMERIC(15,2),
    
    -- Additional Info
    cashier_name VARCHAR(100),
    manager_name VARCHAR(100),
    printed_at TIMESTAMP WITH TIME ZONE,
    is_backed_up BOOLEAN DEFAULT false,
    backup_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BIR Daily Sales Summary
CREATE TABLE IF NOT EXISTS public.bir_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    business_date DATE NOT NULL,
    terminal_id VARCHAR(20) NOT NULL DEFAULT 'TERMINAL-01',
    
    -- Summary totals
    total_gross_sales NUMERIC(15,2) DEFAULT 0,
    total_net_sales NUMERIC(15,2) DEFAULT 0,
    total_vat_sales NUMERIC(15,2) DEFAULT 0,
    total_vat_amount NUMERIC(15,2) DEFAULT 0,
    total_vat_exempt NUMERIC(15,2) DEFAULT 0,
    total_zero_rated NUMERIC(15,2) DEFAULT 0,
    total_discounts NUMERIC(15,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,
    
    -- Top selling items
    top_items JSONB DEFAULT '[]',
    
    -- Payment method breakdown
    payment_breakdown JSONB DEFAULT '{}',
    
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(store_id, business_date, terminal_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bir_readings_store_date ON bir_readings(store_id, reading_date);
CREATE INDEX IF NOT EXISTS idx_bir_readings_type ON bir_readings(reading_type);
CREATE INDEX IF NOT EXISTS idx_bir_daily_summary_store_date ON bir_daily_summary(store_id, business_date);

-- Enable RLS
ALTER TABLE bir_store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_reset_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bir_daily_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view BIR config for accessible stores" ON bir_store_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_users au
            WHERE au.user_id = auth.uid()
            AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
        )
    );

CREATE POLICY "Admins can manage BIR config" ON bir_store_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM app_users au
            WHERE au.user_id = auth.uid()
            AND au.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "System can manage reset counters" ON bir_reset_counters
    FOR ALL USING (true);

CREATE POLICY "Users can view readings for accessible stores" ON bir_readings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_users au
            WHERE au.user_id = auth.uid()
            AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
        )
    );

CREATE POLICY "System can insert readings" ON bir_readings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view daily summary for accessible stores" ON bir_daily_summary
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM app_users au
            WHERE au.user_id = auth.uid()
            AND (au.role IN ('admin', 'owner') OR store_id = ANY(au.store_ids))
        )
    );

CREATE POLICY "System can manage daily summary" ON bir_daily_summary
    FOR ALL USING (true);