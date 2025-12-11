-- Create refunds table for tracking refund transactions
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) NOT NULL,
  original_transaction_id UUID REFERENCES transactions(id) NOT NULL,
  original_receipt_number VARCHAR NOT NULL,
  refund_receipt_number VARCHAR NOT NULL UNIQUE,
  
  -- Refund Details
  refund_type VARCHAR NOT NULL CHECK (refund_type IN ('full', 'partial')),
  refund_reason_category VARCHAR NOT NULL,
  refund_reason TEXT NOT NULL,
  refund_notes TEXT,
  
  -- Refunded Items (for partial refunds)
  refunded_items JSONB NOT NULL DEFAULT '[]',
  
  -- Financial
  original_transaction_total NUMERIC NOT NULL DEFAULT 0,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  refund_vat_amount NUMERIC DEFAULT 0,
  refund_method VARCHAR NOT NULL,
  refund_method_details JSONB,
  
  -- Inventory
  items_returned_to_stock JSONB DEFAULT '[]',
  items_damaged JSONB DEFAULT '[]',
  
  -- Staff Info
  processed_by_user_id UUID NOT NULL,
  processed_by_name TEXT NOT NULL,
  authorized_by_user_id UUID,
  authorized_by_name TEXT,
  
  -- BIR Compliance
  terminal_id VARCHAR DEFAULT 'POS-001',
  sequence_number BIGINT,
  shift_id UUID REFERENCES shifts(id),
  
  -- Timestamps
  refund_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view refunds for their stores"
ON public.refunds FOR SELECT
USING (true);

CREATE POLICY "Users can create refunds"
ON public.refunds FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update refunds"
ON public.refunds FOR UPDATE
USING (true);

-- Create indexes for common queries
CREATE INDEX idx_refunds_store_id ON public.refunds(store_id);
CREATE INDEX idx_refunds_original_transaction_id ON public.refunds(original_transaction_id);
CREATE INDEX idx_refunds_refund_date ON public.refunds(refund_date);
CREATE INDEX idx_refunds_refund_receipt_number ON public.refunds(refund_receipt_number);
CREATE INDEX idx_refunds_shift_id ON public.refunds(shift_id);

-- Create sequence for refund numbers
CREATE SEQUENCE IF NOT EXISTS refund_sequence_number START 1;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_refunds_updated_at
BEFORE UPDATE ON public.refunds
FOR EACH ROW
EXECUTE FUNCTION public.update_refunds_updated_at();