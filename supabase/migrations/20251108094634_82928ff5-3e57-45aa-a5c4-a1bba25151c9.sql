-- Fix all auth users with empty string tokens by setting them to NULL
-- This resolves the "sql: Scan error on column index 3, name 'confirmation_token'" authentication error
-- that affects 17 users in the system

UPDATE auth.users 
SET 
  confirmation_token = NULL,
  email_change = NULL,
  email_change_token_new = NULL,
  recovery_token = NULL
WHERE 
  confirmation_token = '' OR
  email_change = '' OR
  email_change_token_new = '' OR
  recovery_token = '';