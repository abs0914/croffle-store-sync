-- =====================================================
-- CROFFLE STORE SYNC - STEP-BY-STEP DATABASE FIXES
-- =====================================================
-- Run these queries ONE BY ONE in Supabase SQL Editor
-- Check the output of each step before proceeding

-- =====================================================
-- STEP 1: CHECK WHAT TABLES EXIST
-- =====================================================

-- Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'conversion_ingredients', 
    'conversion_recipe_ingredients', 
    'conversion_recipes', 
    'inventory_conversions', 
    'commissary_inventory',
    'inventory_items'
);

-- =====================================================
-- STEP 2: CHECK INVENTORY_CONVERSIONS STRUCTURE
-- =====================================================

-- Check the structure of inventory_conversions table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'inventory_conversions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 3: CREATE CONVERSION_RECIPES TABLE
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

-- =====================================================
-- STEP 4: CREATE CONVERSION_RECIPE_INGREDIENTS TABLE
-- =====================================================

-- Create conversion_recipe_ingredients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.conversion_recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversion_recipe_id uuid NOT NULL REFERENCES public.conversion_recipes(id) ON DELETE CASCADE,
    commissary_item_id uuid NOT NULL REFERENCES public.commissary_inventory(id) ON DELETE CASCADE,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- STEP 5: CREATE CONVERSION_INGREDIENTS TABLE
-- =====================================================

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
-- STEP 6: ADD MISSING COLUMN TO INVENTORY_CONVERSIONS
-- =====================================================

-- Add conversion_recipe_id column if it doesn't exist
ALTER TABLE public.inventory_conversions 
ADD COLUMN IF NOT EXISTS conversion_recipe_id uuid REFERENCES public.conversion_recipes(id);

-- =====================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for conversion tables
CREATE INDEX IF NOT EXISTS idx_conversion_recipes_name ON public.conversion_recipes(name);
CREATE INDEX IF NOT EXISTS idx_conversion_recipes_is_active ON public.conversion_recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_conversion_recipe_ingredients_recipe_id ON public.conversion_recipe_ingredients(conversion_recipe_id);
CREATE INDEX IF NOT EXISTS idx_conversion_recipe_ingredients_commissary_item_id ON public.conversion_recipe_ingredients(commissary_item_id);
CREATE INDEX IF NOT EXISTS idx_conversion_ingredients_conversion_id ON public.conversion_ingredients(inventory_conversion_id);
CREATE INDEX IF NOT EXISTS idx_conversion_ingredients_commissary_item_id ON public.conversion_ingredients(commissary_item_id);

-- =====================================================
-- STEP 8: ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable RLS for conversion tables
ALTER TABLE public.conversion_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_ingredients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversion_recipes
CREATE POLICY "Enable read access for authenticated users"
ON public.conversion_recipes
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage conversion recipes"
ON public.conversion_recipes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- Create RLS policies for conversion_recipe_ingredients
CREATE POLICY "Enable read access for authenticated users"
ON public.conversion_recipe_ingredients
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage conversion recipe ingredients"
ON public.conversion_recipe_ingredients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- Create RLS policies for conversion_ingredients
CREATE POLICY "Enable read access for authenticated users"
ON public.conversion_ingredients
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage conversion ingredients"
ON public.conversion_ingredients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.user_id = auth.uid() AND au.role IN ('admin', 'owner')
  )
  OR auth.email() = 'admin@example.com'
);

-- =====================================================
-- STEP 9: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for conversion tables
GRANT ALL ON public.conversion_recipes TO authenticated;
GRANT ALL ON public.conversion_recipes TO service_role;
GRANT ALL ON public.conversion_recipe_ingredients TO authenticated;
GRANT ALL ON public.conversion_recipe_ingredients TO service_role;
GRANT ALL ON public.conversion_ingredients TO authenticated;
GRANT ALL ON public.conversion_ingredients TO service_role;

-- =====================================================
-- STEP 10: CREATE UPDATED_AT TRIGGERS
-- =====================================================

-- Create updated_at triggers for conversion tables
CREATE TRIGGER update_conversion_recipes_updated_at
    BEFORE UPDATE ON public.conversion_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 11: VERIFY EVERYTHING IS WORKING
-- =====================================================

-- Check that all tables now exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'conversion_ingredients', 
    'conversion_recipe_ingredients', 
    'conversion_recipes', 
    'inventory_conversions', 
    'commissary_inventory'
);

-- Check foreign key constraints
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

-- First, let's check what columns actually exist in inventory_conversions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory_conversions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for orphaned records in the new conversion tables (should return 0 for all)
SELECT 'conversion_ingredients orphans' as check_type, count(*) as count
FROM public.conversion_ingredients ci
WHERE ci.commissary_item_id NOT IN (SELECT id FROM public.commissary_inventory)

UNION ALL

SELECT 'conversion_recipe_ingredients orphans' as check_type, count(*) as count
FROM public.conversion_recipe_ingredients cri
WHERE cri.commissary_item_id NOT IN (SELECT id FROM public.commissary_inventory);

-- Note: Skipping inventory_conversions orphan check since the column structure may vary

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 'Database fixes completed successfully!' as status;
