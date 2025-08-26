-- Add missing BIR compliance fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS supplier_name TEXT,
ADD COLUMN IF NOT EXISTS supplier_address TEXT,
ADD COLUMN IF NOT EXISTS supplier_tin TEXT,
ADD COLUMN IF NOT EXISTS accreditation_number TEXT,
ADD COLUMN IF NOT EXISTS accreditation_date DATE,
ADD COLUMN IF NOT EXISTS bir_final_permit_number TEXT,
ADD COLUMN IF NOT EXISTS is_vat_registered BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS non_vat_disclaimer TEXT DEFAULT 'This document is not valid for claim of input tax.',
ADD COLUMN IF NOT EXISTS validity_statement TEXT DEFAULT 'This receipt/invoice shall be valid for five (5) years from the date of the ATP.';

-- Update store_settings to add enhanced BIR compliance fields to bir_compliance_config
DO $$
BEGIN
    -- Add new configuration options to existing store_settings records
    UPDATE public.store_settings 
    SET bir_compliance_config = COALESCE(bir_compliance_config, '{}'::jsonb) || jsonb_build_object(
        'vat_mode', true,
        'non_vat_disclaimer', 'This document is not valid for claim of input tax.',
        'validity_statement', 'This receipt/invoice shall be valid for five (5) years from the date of the ATP.',
        'show_exempt_marking', false,
        'show_validity_statement', true,
        'show_supplier_info', true,
        'require_accredited_supplier', true
    )
    WHERE bir_compliance_config IS NOT NULL;
END $$;

-- Add comments for new fields
COMMENT ON COLUMN public.stores.supplier_name IS 'Name of accredited supplier/distributor';
COMMENT ON COLUMN public.stores.supplier_address IS 'Address of accredited supplier/distributor';
COMMENT ON COLUMN public.stores.supplier_tin IS 'TIN of accredited supplier/distributor';
COMMENT ON COLUMN public.stores.accreditation_number IS 'BIR accreditation number for the supplier';
COMMENT ON COLUMN public.stores.accreditation_date IS 'Date when the supplier was accredited';
COMMENT ON COLUMN public.stores.bir_final_permit_number IS 'BIR final permit to use number';
COMMENT ON COLUMN public.stores.is_vat_registered IS 'Whether the store is VAT registered or not';
COMMENT ON COLUMN public.stores.non_vat_disclaimer IS 'Disclaimer text for non-VAT taxpayers';
COMMENT ON COLUMN public.stores.validity_statement IS 'Legal validity statement for receipts/invoices';