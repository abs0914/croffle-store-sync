-- Fix auth users with empty string tokens by setting them to NULL
UPDATE auth.users 
SET 
  confirmation_token = NULL,
  email_change = NULL,
  email_change_token_new = NULL,
  recovery_token = NULL
WHERE email IN (
  'smtacloban.cashier@thecroffle.com',
  'smtacloban.manager@thecroffle.com'
)
AND (
  confirmation_token = '' OR
  email_change = '' OR
  email_change_token_new = '' OR
  recovery_token = ''
);