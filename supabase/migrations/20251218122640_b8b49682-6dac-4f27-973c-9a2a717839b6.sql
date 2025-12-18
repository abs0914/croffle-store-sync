-- Create table to track eSales monthly report submissions per RMO 12-2012
CREATE TABLE public.bir_esales_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  machine_identification_number TEXT NOT NULL,
  reporting_month TEXT NOT NULL, -- YYYY-MM format
  reporting_year INTEGER NOT NULL,
  reporting_month_number INTEGER NOT NULL,
  
  -- Sales breakdown per RMO 12-2012
  vatable_sales NUMERIC(15,2) NOT NULL DEFAULT 0, -- Net of VAT
  vat_amount NUMERIC(15,2) NOT NULL DEFAULT 0, -- 12% VAT
  vat_zero_rated_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_exempt_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
  other_percentage_tax_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_discounts NUMERIC(15,2) NOT NULL DEFAULT 0,
  
  -- Transaction tracking
  total_transactions INTEGER NOT NULL DEFAULT 0,
  first_receipt_number TEXT,
  last_receipt_number TEXT,
  
  -- Submission tracking
  submission_status TEXT NOT NULL DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted', 'amended')),
  amendment_count INTEGER NOT NULL DEFAULT 0,
  sales_report_number TEXT, -- SRN assigned by BIR upon submission
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint for store-machine-month combination
  CONSTRAINT unique_esales_report UNIQUE (store_id, machine_identification_number, reporting_month)
);

-- Enable RLS
ALTER TABLE public.bir_esales_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their store's eSales reports" 
ON public.bir_esales_reports 
FOR SELECT 
USING (
  store_id IN (
    SELECT unnest(store_ids) FROM public.app_users WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
);

CREATE POLICY "Admins and owners can insert eSales reports" 
ON public.bir_esales_reports 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
  )
);

CREATE POLICY "Admins and owners can update eSales reports" 
ON public.bir_esales_reports 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_bir_esales_reports_store_month ON public.bir_esales_reports(store_id, reporting_month);
CREATE INDEX idx_bir_esales_reports_min ON public.bir_esales_reports(machine_identification_number);

-- Trigger to update updated_at
CREATE TRIGGER update_bir_esales_reports_updated_at
  BEFORE UPDATE ON public.bir_esales_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();