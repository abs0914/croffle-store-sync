-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create hourly cron job for SM Accreditation exports
-- This will run every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
SELECT cron.schedule(
  'sm-accreditation-hourly-export',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://bwmkqscqkfoezcuzgpwq.supabase.co/functions/v1/sm-accreditation-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtxc2Nxa2ZvZXpjdXpncHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1Mzg1NzEsImV4cCI6MjA2MjExNDU3MX0.Iv2rmTZIMIXQPdk8slgyhQMxiz1YXRvZGe3hoBPVImc"}'::jsonb,
        body:='{"action": "execute_hourly_export"}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to check scheduled cron jobs
CREATE OR REPLACE FUNCTION public.get_sm_cron_jobs()
RETURNS TABLE(
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport int,
  database text,
  username text,
  active boolean,
  jobname text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  WHERE j.jobname LIKE '%sm-accreditation%';
$$;

-- Log the cron job creation
DO $$
BEGIN
  RAISE NOTICE 'SM Accreditation hourly cron job has been scheduled to run every hour at minute 0';
END
$$;