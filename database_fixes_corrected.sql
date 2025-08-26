-- =====================================================
-- CORRECTED DATABASE FIXES
-- =====================================================
-- Based on the error, it seems inventory_conversions doesn't have commissary_item_id
-- Let's fix this step by step

-- =====================================================
-- STEP 1: DIAGNOSTIC - CHECK CURRENT STATE
-- =====================================================

-- Check what tables exist
SELECT 'Tables that exist:' as info, table_name 
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

-- Check inventory_conversions structure
SELECT 'inventory_conversions columns:' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'inventory_conversions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 2: CREATE MISSING TABLES
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
-- STEP 3: FIX INVENTORY_CONVERSIONS TABLE
-- =====================================================

-- Check if commissary_item_id column exists in inventory_conversions
DO $$
BEGIN
    -- Add commissary_item_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_conversions' 
        AND column_name = 'commissary_item_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_conversions 
        ADD COLUMN commissary_item_id uuid REFERENCES public.commissary_inventory(id);
        
        RAISE NOTICE 'Added commissary_item_id column to inventory_conversions';
    ELSE
        RAISE NOTICE 'commissary_item_id column already exists in inventory_conversions';
    END IF;
END $$;

-- Add conversion_recipe_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_conversions' 
        AND column_name = 'conversion_recipe_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_conversions 
        ADD COLUMN conversion_recipe_id uuid REFERENCES public.conversion_recipes(id);
        
        RAISE NOTICE 'Added conversion_recipe_id column to inventory_conversions';
    ELSE
        RAISE NOTICE 'conversion_recipe_id column already exists in inventory_conversions';
    END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversion_recipes_name ON public.conversion_recipes(name);
CREATE INDEX IF NOT EXISTS idx_conversion_recipes_is_active ON public.conversion_recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_conversion_recipe_ingredients_recipe_id ON public.conversion_recipe_ingredients(conversion_recipe_id);
CREATE INDEX IF NOT EXISTS idx_conversion_recipe_ingredients_commissary_item_id ON public.conversion_recipe_ingredients(commissary_item_id);
CREATE INDEX IF NOT EXISTS idx_conversion_ingredients_conversion_id ON public.conversion_ingredients(inventory_conversion_id);
CREATE INDEX IF NOT EXISTS idx_conversion_ingredients_commissary_item_id ON public.conversion_ingredients(commissary_item_id);

-- Add index for new columns in inventory_conversions
CREATE INDEX IF NOT EXISTS idx_inventory_conversions_commissary_item_id ON public.inventory_conversions(commissary_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_conversions_conversion_recipe_id ON public.inventory_conversions(conversion_recipe_id);

-- =====================================================
-- STEP 5: ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable RLS for conversion tables
ALTER TABLE public.conversion_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_ingredients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for conversion_recipes
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.conversion_recipes;
CREATE POLICY "Enable read access for authenticated users"
ON public.conversion_recipes
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage conversion recipes" ON public.conversion_recipes;
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
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.conversion_recipe_ingredients;
CREATE POLICY "Enable read access for authenticated users"
ON public.conversion_recipe_ingredients
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage conversion recipe ingredients" ON public.conversion_recipe_ingredients;
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
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.conversion_ingredients;
CREATE POLICY "Enable read access for authenticated users"
ON public.conversion_ingredients
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage conversion ingredients" ON public.conversion_ingredients;
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
-- STEP 6: GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.conversion_recipes TO authenticated;
GRANT ALL ON public.conversion_recipes TO service_role;
GRANT ALL ON public.conversion_recipe_ingredients TO authenticated;
GRANT ALL ON public.conversion_recipe_ingredients TO service_role;
GRANT ALL ON public.conversion_ingredients TO authenticated;
GRANT ALL ON public.conversion_ingredients TO service_role;

-- =====================================================
-- STEP 7: CREATE TRIGGERS
-- =====================================================

-- Create updated_at trigger for conversion_recipes
DROP TRIGGER IF EXISTS update_conversion_recipes_updated_at ON public.conversion_recipes;
CREATE TRIGGER update_conversion_recipes_updated_at
    BEFORE UPDATE ON public.conversion_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 8: VERIFICATION
-- =====================================================

-- Check that all tables now exist
SELECT 'Final table check:' as info, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'conversion_ingredients', 
    'conversion_recipe_ingredients', 
    'conversion_recipes', 
    'inventory_conversions', 
    'commissary_inventory'
);

-- Check inventory_conversions structure after fixes
SELECT 'inventory_conversions final structure:' as info, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'inventory_conversions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 'Foreign key constraints:' as info,
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

-- Final success message
SELECT 'SUCCESS: Database fixes completed!' as status;
