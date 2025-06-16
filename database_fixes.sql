-- =====================================================
-- CROFFLE STORE SYNC - CRITICAL DATABASE FIXES
-- =====================================================
-- Run these queries manually in Supabase SQL Editor
-- Execute in the order provided below

-- =====================================================
-- 1. CHECK CURRENT DATABASE STATE
-- =====================================================

-- First, let's check what tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('conversion_ingredients', 'conversion_recipe_ingredients', 'conversion_recipes', 'inventory_conversions', 'commissary_inventory');

-- Check the structure of inventory_conversions (this should exist)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_conversions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 2. CREATE MISSING CONVERSION TABLES FIRST
-- =====================================================

-- Create conversion_recipes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.conversion_recipes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    finished_item_name text NOT NULL,
    finished_item_unit text NOT NULL,
    yield_quantity numeric DEFAULT 1 NOT NULL,
    instructions text,
    is_active boolean DEFAULT true,
    created_by text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create conversion_recipe_ingredients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.conversion_recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversion_recipe_id uuid NOT NULL REFERENCES public.conversion_recipes(id) ON DELETE CASCADE,
    commissary_item_id uuid NOT NULL REFERENCES public.commissary_inventory(id) ON DELETE CASCADE,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create conversion_ingredients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.conversion_ingredients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_conversion_id uuid NOT NULL REFERENCES public.inventory_conversions(id) ON DELETE CASCADE,
    commissary_item_id uuid NOT NULL REFERENCES public.commissary_inventory(id) ON DELETE CASCADE,
    quantity_used numeric NOT NULL,
    unit_cost numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- 3. FIX FOREIGN KEY REFERENCES (NOW THAT TABLES EXIST)
-- =====================================================

-- The inventory_conversions table should already have the correct foreign key
-- But let's verify and fix if needed
DO $$
BEGIN
    -- Check if the foreign key constraint exists and is correct
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'inventory_conversions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND ccu.column_name = 'commissary_item_id'
        AND ccu.table_name = 'commissary_inventory'
    ) THEN
        -- Drop any existing incorrect constraint
        ALTER TABLE public.inventory_conversions
        DROP CONSTRAINT IF EXISTS inventory_conversions_commissary_item_id_fkey;

        -- Add the correct constraint
        ALTER TABLE public.inventory_conversions
        ADD CONSTRAINT inventory_conversions_commissary_item_id_fkey
        FOREIGN KEY (commissary_item_id) REFERENCES public.commissary_inventory(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 4. ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add missing columns to inventory_conversions if they don't exist
ALTER TABLE public.inventory_conversions
ADD COLUMN IF NOT EXISTS conversion_recipe_id uuid REFERENCES public.conversion_recipes(id);

-- =====================================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for conversion tables
CREATE INDEX IF NOT EXISTS idx_conversion_recipes_name ON conversion_recipes(name);
CREATE INDEX IF NOT EXISTS idx_conversion_recipes_is_active ON conversion_recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_conversion_recipe_ingredients_recipe_id ON conversion_recipe_ingredients(conversion_recipe_id);
CREATE INDEX IF NOT EXISTS idx_conversion_recipe_ingredients_commissary_item_id ON conversion_recipe_ingredients(commissary_item_id);
CREATE INDEX IF NOT EXISTS idx_conversion_ingredients_conversion_id ON conversion_ingredients(inventory_conversion_id);
CREATE INDEX IF NOT EXISTS idx_conversion_ingredients_commissary_item_id ON conversion_ingredients(commissary_item_id);

-- =====================================================
-- 5. ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable RLS for conversion tables
ALTER TABLE conversion_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_ingredients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversion_recipes
CREATE POLICY "Enable read access for authenticated users"
ON conversion_recipes
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage conversion recipes"
ON conversion_recipes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- Create RLS policies for conversion_recipe_ingredients
CREATE POLICY "Enable read access for authenticated users"
ON conversion_recipe_ingredients
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage conversion recipe ingredients"
ON conversion_recipe_ingredients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- Create RLS policies for conversion_ingredients
CREATE POLICY "Enable read access for authenticated users"
ON conversion_ingredients
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage conversion ingredients"
ON conversion_ingredients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for conversion tables
GRANT ALL ON conversion_recipes TO authenticated;
GRANT ALL ON conversion_recipes TO service_role;
GRANT ALL ON conversion_recipe_ingredients TO authenticated;
GRANT ALL ON conversion_recipe_ingredients TO service_role;
GRANT ALL ON conversion_ingredients TO authenticated;
GRANT ALL ON conversion_ingredients TO service_role;

-- =====================================================
-- 7. CREATE UPDATED_AT TRIGGERS
-- =====================================================

-- Create updated_at triggers for conversion tables
CREATE TRIGGER update_conversion_recipes_updated_at
    BEFORE UPDATE ON conversion_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. VERIFY DATA INTEGRITY
-- =====================================================

-- Check for orphaned records after the fixes
SELECT 'conversion_ingredients orphans' as check_type, count(*) as count
FROM conversion_ingredients ci 
WHERE ci.commissary_item_id NOT IN (SELECT id FROM commissary_inventory)

UNION ALL

SELECT 'conversion_recipe_ingredients orphans' as check_type, count(*) as count
FROM conversion_recipe_ingredients cri 
WHERE cri.commissary_item_id NOT IN (SELECT id FROM commissary_inventory)

UNION ALL

SELECT 'inventory_conversions orphans' as check_type, count(*) as count
FROM inventory_conversions ic 
WHERE ic.commissary_item_id IS NOT NULL 
AND ic.commissary_item_id NOT IN (SELECT id FROM commissary_inventory);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the fixes worked:

-- 1. Check foreign key constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('conversion_ingredients', 'conversion_recipe_ingredients', 'inventory_conversions')
ORDER BY tc.table_name, kcu.column_name;

-- 2. Check table structures
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('commissary_inventory', 'inventory_items', 'conversion_recipes', 'conversion_ingredients')
ORDER BY table_name, ordinal_position;
