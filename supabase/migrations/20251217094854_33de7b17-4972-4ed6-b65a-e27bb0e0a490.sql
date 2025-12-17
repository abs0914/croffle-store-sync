-- Phase 4: Add discount_beneficiaries column for multi-discount support
-- This column stores an array of discount beneficiaries with their individual amounts

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS discount_beneficiaries JSONB DEFAULT '[]';

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS regular_diners INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN transactions.discount_beneficiaries IS 'Array of discount beneficiaries: [{type, idNumber, name, discountAmount, vatExemptionAmount, isVATExempt, discountRate}]';
COMMENT ON COLUMN transactions.regular_diners IS 'Number of regular diners (no discount) sharing the bill';