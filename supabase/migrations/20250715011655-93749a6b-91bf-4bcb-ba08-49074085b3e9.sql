-- Create SM export logs table for tracking transmission status
CREATE TABLE public.sm_export_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL DEFAULT 'export',
  success BOOLEAN NOT NULL DEFAULT false,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  upload_sent BOOLEAN NOT NULL DEFAULT false,
  transaction_count INTEGER DEFAULT 0,
  detail_count INTEGER DEFAULT 0,
  filename VARCHAR(255),
  details TEXT,
  error_message TEXT,
  execution_time INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.sm_export_logs 
ADD CONSTRAINT fk_sm_export_logs_store_id 
FOREIGN KEY (store_id) REFERENCES public.stores(id);

-- Create index for better query performance
CREATE INDEX idx_sm_export_logs_store_id_created_at 
ON public.sm_export_logs(store_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.sm_export_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their store's export logs" 
ON public.sm_export_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() 
    AND (
      role IN ('admin', 'owner') 
      OR store_id = ANY(store_ids)
    )
  )
);

CREATE POLICY "Users can insert export logs for their stores" 
ON public.sm_export_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE user_id = auth.uid() 
    AND (
      role IN ('admin', 'owner') 
      OR store_id = ANY(store_ids)
    )
  )
);

-- Add function for logging SM export activity
CREATE OR REPLACE FUNCTION public.log_sm_export_activity(
  p_store_id UUID,
  p_action VARCHAR DEFAULT 'export',
  p_success BOOLEAN DEFAULT true,
  p_email_sent BOOLEAN DEFAULT false,
  p_upload_sent BOOLEAN DEFAULT false,
  p_transaction_count INTEGER DEFAULT 0,
  p_detail_count INTEGER DEFAULT 0,
  p_filename VARCHAR DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_execution_time INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.sm_export_logs (
    store_id, action, success, email_sent, upload_sent,
    transaction_count, detail_count, filename, details, 
    error_message, execution_time
  ) VALUES (
    p_store_id, p_action, p_success, p_email_sent, p_upload_sent,
    p_transaction_count, p_detail_count, p_filename, p_details,
    p_error_message, p_execution_time
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;