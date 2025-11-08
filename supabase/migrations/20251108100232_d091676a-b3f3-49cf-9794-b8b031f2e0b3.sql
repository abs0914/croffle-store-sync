-- Fix remaining auth token fields with empty strings by setting them to NULL
-- This completes the fix for the "sql: Scan error" authentication error
-- Addresses the three token fields that were missed in the previous migration:
-- email_change_token_current, phone_change_token, and reauthentication_token

UPDATE auth.users 
SET 
  email_change_token_current = NULL,
  phone_change_token = NULL,
  reauthentication_token = NULL
WHERE 
  email_change_token_current = '' OR
  phone_change_token = '' OR
  reauthentication_token = '';