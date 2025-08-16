-- Create budget alerts table for real-time budget monitoring
CREATE TABLE public.budget_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.expense_budgets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_warning', 'threshold_exceeded', 'budget_exhausted')),
  threshold_percentage NUMERIC NOT NULL,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for budget alerts
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget alerts
CREATE POLICY "Users can view budget alerts for their stores"
ON public.budget_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.expense_budgets eb
    WHERE eb.id = budget_alerts.budget_id
    AND (
      EXISTS (
        SELECT 1 FROM public.app_users au
        WHERE au.user_id = auth.uid()
        AND (
          au.role IN ('admin', 'owner')
          OR eb.store_id = ANY(au.store_ids)
        )
      )
    )
  )
);

-- System can insert budget alerts
CREATE POLICY "System can insert budget alerts"
ON public.budget_alerts
FOR INSERT
WITH CHECK (true);

-- Admins can manage budget alerts
CREATE POLICY "Admins can manage budget alerts"
ON public.budget_alerts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid()
    AND au.role IN ('admin', 'owner')
  )
);

-- Add indexes for performance
CREATE INDEX idx_budget_alerts_budget_id ON public.budget_alerts(budget_id);
CREATE INDEX idx_budget_alerts_alert_type ON public.budget_alerts(alert_type);
CREATE INDEX idx_budget_alerts_created_at ON public.budget_alerts(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_budget_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_alerts_updated_at
  BEFORE UPDATE ON public.budget_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budget_alerts_updated_at();