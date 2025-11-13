-- Grant authenticated users permission to read from auth.users
-- This is needed for RLS policies and functions that reference auth.users

GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;