-- Add custom_permissions column to app_users table to allow permission overrides
ALTER TABLE public.app_users 
ADD COLUMN custom_permissions JSONB DEFAULT NULL;

-- Add index for performance on custom_permissions queries
CREATE INDEX IF NOT EXISTS idx_app_users_custom_permissions 
ON public.app_users USING GIN(custom_permissions);

-- Add comment for documentation
COMMENT ON COLUMN public.app_users.custom_permissions IS 'JSONB object containing individual permission overrides for this user. When set, these override the default role-based permissions.';

-- Update the updated_at trigger to ensure it fires when custom_permissions change
-- (The existing trigger should already handle this, but let's make sure)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';