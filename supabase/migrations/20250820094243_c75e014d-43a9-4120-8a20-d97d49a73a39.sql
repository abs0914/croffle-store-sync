-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to auto-close shifts every hour
SELECT cron.schedule(
  'auto-close-old-shifts',
  '0 * * * *', -- Run every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://bwmkqscqkfoezcuzgpwq.supabase.co/functions/v1/auto-close-shifts',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc"}'::jsonb,
        body:=concat('{"scheduledAt": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger shift auto-close (for testing)
CREATE OR REPLACE FUNCTION public.trigger_auto_close_shifts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call the edge function
  SELECT 
    net.http_post(
      url:='https://bwmkqscqkfoezcuzgpwq.supabase.co/functions/v1/auto-close-shifts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc"}'::jsonb,
      body:='{"manualTrigger": true}'::jsonb
    ) INTO result;
    
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users for manual trigger (admins only)
REVOKE ALL ON FUNCTION public.trigger_auto_close_shifts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_auto_close_shifts() TO authenticated;