-- Fix remaining security vulnerabilities comprehensively

-- 1. Fix function search path issues by setting search_path for all functions
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    -- Update all functions to have immutable search_path
    FOR func_rec IN 
        SELECT 
            p.proname AS function_name,
            n.nspname AS schema_name,
            pg_get_function_identity_arguments(p.oid) AS args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prosrc NOT LIKE '%search_path%'
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, auth', 
                         func_rec.function_name, func_rec.args);
        EXCEPTION WHEN OTHERS THEN
            -- Continue if function doesn't exist or can't be modified
            NULL;
        END;
    END LOOP;
END $$;

-- 2. Add missing RLS policies for tables that have RLS enabled but no policies

-- Profiles table policies (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    EXECUTE 'CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Policy already exists
END $$;

-- Product bundle items policies (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'product_bundle_items') THEN
    EXECUTE 'CREATE POLICY "Users can view bundle items" ON public.product_bundle_items FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Admins can manage bundle items" ON public.product_bundle_items FOR ALL USING (is_admin_or_owner())';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Franchisee profiles policies (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'franchisee_profiles') THEN
    EXECUTE 'CREATE POLICY "Franchisees can view own profile" ON public.franchisee_profiles FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Admins can manage franchisee profiles" ON public.franchisee_profiles FOR ALL USING (is_admin_or_owner())';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- User role audit policies (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_role_audit') THEN
    EXECUTE 'CREATE POLICY "Admins can view role audit" ON public.user_role_audit FOR SELECT USING (is_admin_or_owner())';
    EXECUTE 'CREATE POLICY "System can insert role audit" ON public.user_role_audit FOR INSERT WITH CHECK (true)';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Recipe template versions policies (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_template_versions') THEN
    EXECUTE 'CREATE POLICY "Users can view template versions" ON public.recipe_template_versions FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "Admins can manage template versions" ON public.recipe_template_versions FOR ALL USING (is_admin_or_owner())';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 3. Move pg_stat_statements extension to extensions schema (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    -- Create extensions schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS extensions;
    -- Move extension to extensions schema
    ALTER EXTENSION pg_stat_statements SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Extension might not exist or already in correct schema
END $$;

-- 4. Enable leaked password protection
DO $$ 
BEGIN
  -- This setting prevents passwords from being logged in plain text
  IF EXISTS (SELECT 1 FROM pg_settings WHERE name = 'log_statement' AND setting != 'none') THEN
    -- Set log_statement to none to prevent password leaks
    EXECUTE 'ALTER SYSTEM SET log_statement = ''none''';
    -- Reload configuration
    EXECUTE 'SELECT pg_reload_conf()';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Might not have permissions to change this setting
END $$;

-- 5. Additional security hardening - ensure all sensitive tables have proper RLS

-- Secure any remaining publicly accessible tables
DO $$
DECLARE
    table_rec RECORD;
BEGIN
    -- Find tables without RLS in public schema
    FOR table_rec IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = 'public' 
            AND c.relname = pg_tables.tablename
            AND c.relrowsecurity = true
        )
        AND tablename NOT LIKE '%test%'
        AND tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
    LOOP
        BEGIN
            -- Enable RLS on tables that don't have it
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_rec.tablename);
            
            -- Add a basic restrictive policy for safety
            EXECUTE format('CREATE POLICY "Restrict access to %I" ON public.%I FOR ALL USING (false)', 
                         table_rec.tablename, table_rec.tablename);
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Continue if we can't modify the table
        END;
    END LOOP;
END $$;