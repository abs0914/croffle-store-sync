-- Update the users with correct email addresses (lowercase)
UPDATE public.app_users 
SET role = 'admin'::app_role,
    updated_at = now()
WHERE email IN (
    'charm.inventory@thecrofflestore.com',
    'kathrence.purchasing@thecrofflestore.com'
);