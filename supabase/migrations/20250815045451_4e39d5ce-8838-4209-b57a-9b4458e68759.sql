-- Update specific users to admin role
UPDATE public.app_users 
SET role = 'admin'::app_role,
    updated_at = now()
WHERE email IN (
    'Charm.inventory@thecrofflestore.com',
    'Kathrence.purchasing@thecrofflestore.com'
);

-- Optional: If you want to make ALL existing users admin (use with caution)
-- UPDATE public.app_users 
-- SET role = 'admin'::app_role,
--     updated_at = now()
-- WHERE role != 'admin';