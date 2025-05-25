-- Create stores table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.stores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    logo_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stores_name ON public.stores(name);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores(is_active);

-- Enable RLS
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stores
CREATE POLICY "Enable read access for authenticated users" 
ON public.stores
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and owners can manage stores" 
ON public.stores
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au 
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR
  auth.email() = 'admin@example.com'
);

-- Create updated_at trigger for stores
CREATE TRIGGER update_stores_updated_at 
    BEFORE UPDATE ON public.stores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample stores if none exist
INSERT INTO public.stores (name, address, phone, email, is_active)
SELECT 'Main Store', '123 Main St, City, State', '+1-555-0123', 'main@croffle.com', true
WHERE NOT EXISTS (SELECT 1 FROM public.stores);

INSERT INTO public.stores (name, address, phone, email, is_active)
SELECT 'Branch Store', '456 Branch Ave, City, State', '+1-555-0456', 'branch@croffle.com', true
WHERE NOT EXISTS (SELECT 1 FROM public.stores WHERE name = 'Branch Store');

-- Grant permissions
GRANT ALL ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
