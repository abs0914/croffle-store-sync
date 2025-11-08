-- Restore token fields from NULL back to empty strings
-- This fixes the "sql: Scan error" by giving Supabase Auth the format it expects

UPDATE auth.users 
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL OR
  email_change_token_current IS NULL OR
  email_change_token_new IS NULL OR
  phone_change_token IS NULL OR
  reauthentication_token IS NULL;