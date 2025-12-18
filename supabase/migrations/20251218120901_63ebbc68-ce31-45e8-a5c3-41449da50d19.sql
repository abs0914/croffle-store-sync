-- Add missing BIR compliance fields for supplier accreditation
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS supplier_accreditation_date date,
ADD COLUMN IF NOT EXISTS supplier_accreditation_valid_until date,
ADD COLUMN IF NOT EXISTS accreditation_valid_until date,
ADD COLUMN IF NOT EXISTS reset_counter integer DEFAULT 0;

COMMENT ON COLUMN public.stores.supplier_accreditation_date IS 'POS Supplier accreditation date issued by BIR';
COMMENT ON COLUMN public.stores.supplier_accreditation_valid_until IS 'POS Supplier accreditation validity date';
COMMENT ON COLUMN public.stores.accreditation_valid_until IS 'Store accreditation validity date';
COMMENT ON COLUMN public.stores.reset_counter IS 'BIR Z-Counter reset number appended to SI numbers';