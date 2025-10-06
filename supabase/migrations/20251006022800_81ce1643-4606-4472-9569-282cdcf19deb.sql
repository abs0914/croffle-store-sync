-- Add detailed discount tracking columns to transactions table
-- This enables BIR-compliant discount breakdown on receipts

-- Add JSONB column for senior citizen discount details
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS senior_discounts_detail jsonb DEFAULT '[]'::jsonb;

-- Add JSONB column for other discount details (PWD, employee, etc.)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS other_discount_detail jsonb DEFAULT NULL;

-- Add numeric column for VAT exemption amount
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS vat_exemption_amount numeric DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN transactions.senior_discounts_detail IS 'Array of senior citizen discounts: [{id, idNumber, name, discountAmount}]';
COMMENT ON COLUMN transactions.other_discount_detail IS 'Other discount details: {type, amount, idNumber, justification}';
COMMENT ON COLUMN transactions.vat_exemption_amount IS 'Total VAT exemption amount for senior/PWD discounts';

-- Create index for querying by discount details
CREATE INDEX IF NOT EXISTS idx_transactions_senior_discounts ON transactions USING GIN (senior_discounts_detail);
CREATE INDEX IF NOT EXISTS idx_transactions_other_discount ON transactions USING GIN (other_discount_detail);