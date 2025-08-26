# Database Error Troubleshooting Guide

## Error: "column commissary_item_id referenced in foreign key constraint does not exist"

### What This Error Means
This error occurs when trying to create a foreign key constraint on a column that doesn't exist in the table. In our case, it means the conversion tables (`conversion_ingredients`, `conversion_recipe_ingredients`) either:
1. Don't exist yet, OR
2. Exist but don't have the `commissary_item_id` column

### Root Cause Analysis
The error happened because our original SQL script tried to add foreign key constraints to tables that might not exist yet. The script assumed these tables were already created, but they may be missing from your database.

### Solution: Use Step-by-Step Approach

Instead of running the full `database_fixes.sql`, use the safer `database_fixes_step_by_step.sql` file.

## Step-by-Step Fix Process

### Step 1: Check Current Database State
Run this query first to see what tables exist:

```sql
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
```

**Expected Result**: You should see at least `inventory_conversions` and `commissary_inventory`. If you don't see the conversion tables, they need to be created.

### Step 2: Create Missing Tables First
If the conversion tables don't exist, create them:

```sql
-- Create conversion_recipes table
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

-- Create conversion_recipe_ingredients table
CREATE TABLE IF NOT EXISTS public.conversion_recipe_ingredients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversion_recipe_id uuid NOT NULL REFERENCES public.conversion_recipes(id) ON DELETE CASCADE,
    commissary_item_id uuid NOT NULL REFERENCES public.commissary_inventory(id) ON DELETE CASCADE,
    quantity numeric NOT NULL,
    unit text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create conversion_ingredients table
CREATE TABLE IF NOT EXISTS public.conversion_ingredients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_conversion_id uuid NOT NULL REFERENCES public.inventory_conversions(id) ON DELETE CASCADE,
    commissary_item_id uuid NOT NULL REFERENCES public.commissary_inventory(id) ON DELETE CASCADE,
    quantity_used numeric NOT NULL,
    unit_cost numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Step 3: Verify Tables Were Created
Run the check query again to confirm all tables now exist:

```sql
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
```

**Expected Result**: You should now see all 5 tables listed.

### Step 4: Check Foreign Key Constraints
Verify that the foreign key constraints are properly set up:

```sql
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
```

**Expected Result**: You should see foreign key constraints linking `commissary_item_id` columns to `commissary_inventory(id)`.

### Step 5: Complete the Setup
Once the tables exist and foreign keys are working, continue with the rest of the setup:

1. **Add Indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_conversion_recipes_name ON public.conversion_recipes(name);
CREATE INDEX IF NOT EXISTS idx_conversion_recipes_is_active ON public.conversion_recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_conversion_recipe_ingredients_recipe_id ON public.conversion_recipe_ingredients(conversion_recipe_id);
CREATE INDEX IF NOT EXISTS idx_conversion_recipe_ingredients_commissary_item_id ON public.conversion_recipe_ingredients(commissary_item_id);
CREATE INDEX IF NOT EXISTS idx_conversion_ingredients_conversion_id ON public.conversion_ingredients(inventory_conversion_id);
CREATE INDEX IF NOT EXISTS idx_conversion_ingredients_commissary_item_id ON public.conversion_ingredients(commissary_item_id);
```

2. **Enable RLS and Create Policies** (copy from `database_fixes_step_by_step.sql`)

3. **Grant Permissions** (copy from `database_fixes_step_by_step.sql`)

## Alternative: Quick Fix for Existing Systems

If you have an existing system and just need to fix the foreign key references without creating new tables, run this simpler fix:

```sql
-- Check if inventory_conversions has the correct foreign key
SELECT 
    tc.constraint_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'inventory_conversions' 
AND tc.constraint_type = 'FOREIGN KEY'
AND tc.constraint_name LIKE '%commissary_item_id%';

-- If it references inventory_items instead of commissary_inventory, fix it:
ALTER TABLE public.inventory_conversions 
DROP CONSTRAINT IF EXISTS inventory_conversions_commissary_item_id_fkey;

ALTER TABLE public.inventory_conversions 
ADD CONSTRAINT inventory_conversions_commissary_item_id_fkey 
FOREIGN KEY (commissary_item_id) REFERENCES public.commissary_inventory(id) ON DELETE CASCADE;
```

## Verification Steps

After completing the fixes, verify everything is working:

### 1. Test Commissary Service
```sql
-- This should return commissary inventory items
SELECT * FROM public.commissary_inventory LIMIT 5;
```

### 2. Test Table Relationships
```sql
-- This should work without errors
SELECT 
    ic.id,
    ci.name as commissary_item_name,
    is.item as store_item_name
FROM public.inventory_conversions ic
LEFT JOIN public.commissary_inventory ci ON ic.commissary_item_id = ci.id
LEFT JOIN public.inventory_stock is ON ic.inventory_stock_id = is.id
LIMIT 5;
```

### 3. Check for Orphaned Records
```sql
-- This should return 0 for all checks
SELECT 'inventory_conversions orphans' as check_type, count(*) as count
FROM public.inventory_conversions ic 
WHERE ic.commissary_item_id IS NOT NULL 
AND ic.commissary_item_id NOT IN (SELECT id FROM public.commissary_inventory);
```

## Common Issues and Solutions

### Issue: "relation does not exist"
**Solution**: The table hasn't been created yet. Run the CREATE TABLE statements first.

### Issue: "permission denied"
**Solution**: Make sure you're running the queries as a user with sufficient privileges (usually the project owner).

### Issue: "constraint already exists"
**Solution**: The constraint is already there. You can skip that step or use `IF NOT EXISTS` in your statements.

### Issue: Foreign key constraint fails
**Solution**: There might be existing data that violates the constraint. Check for orphaned records and clean them up first.

## Success Indicators

You'll know the fix worked when:
- ✅ All 5 tables exist in your database
- ✅ Foreign key constraints reference the correct tables
- ✅ No orphaned records exist
- ✅ The commissary service functions work without errors
- ✅ Recipe-commissary integration functions properly

## Next Steps After Database Fix

1. **Deploy the updated service code**
2. **Test commissary inventory management**
3. **Test recipe-commissary integration**
4. **Monitor for any remaining errors**

## Getting Help

If you continue to have issues:
1. Check the exact error message carefully
2. Verify which step in the process is failing
3. Run the verification queries to see the current state
4. Make sure you have the necessary database permissions
5. Consider running the fixes in a staging environment first
