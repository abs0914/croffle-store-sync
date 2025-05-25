-- Create app_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'owner', 'manager', 'cashier');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create app_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.app_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text UNIQUE,
    contact_number text,
    role app_role NOT NULL DEFAULT 'cashier',
    store_ids text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_users_user_id ON public.app_users(user_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_store_ids ON public.app_users USING GIN(store_ids);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_app_users_updated_at 
    BEFORE UPDATE ON public.app_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a default admin user if none exists
INSERT INTO public.app_users (
    user_id,
    first_name,
    last_name,
    email,
    role,
    store_ids,
    is_active
)
SELECT 
    auth.uid(),
    'Admin',
    'User',
    'admin@example.com',
    'admin'::app_role,
    ARRAY[]::text[],
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_users WHERE email = 'admin@example.com'
);

-- Grant permissions
GRANT ALL ON public.app_users TO authenticated;
GRANT ALL ON public.app_users TO service_role;
