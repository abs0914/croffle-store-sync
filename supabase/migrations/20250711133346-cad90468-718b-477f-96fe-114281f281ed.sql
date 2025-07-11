-- Add category_id column to product_catalog table for POS categorization

-- Step 1: Add category_id column to product_catalog table
ALTER TABLE public.product_catalog 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_catalog_category_id ON public.product_catalog(category_id);

-- Step 3: Update the ProductCatalog type to include category_id
COMMENT ON COLUMN public.product_catalog.category_id IS 'References the category for POS display and organization';

-- Step 4: Create standard categories for all stores if they don't exist
INSERT INTO public.categories (name, description, store_id, is_active)
SELECT 
  category_name,
  'Category for ' || category_name || ' items',
  s.id,
  true
FROM public.stores s
CROSS JOIN (
  VALUES 
    ('Classic'),
    ('Add-ons'),
    ('Beverages'),
    ('Espresso'),
    ('Croffle Overload'),
    ('Mini Croffle'),
    ('Combo')
) AS standard_categories(category_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.store_id = s.id 
  AND c.name = standard_categories.category_name
);

-- Step 5: Update existing product_catalog entries with proper categories based on their recipe templates
DO $$
DECLARE
  product_record RECORD;
  template_category TEXT;
  target_category_name TEXT;
  target_category_id UUID;
BEGIN
  -- Loop through all product catalog entries that have recipes
  FOR product_record IN 
    SELECT 
      pc.id as product_id,
      pc.store_id,
      pc.product_name,
      rt.category_name as template_category
    FROM public.product_catalog pc
    JOIN public.recipes r ON pc.recipe_id = r.id
    JOIN public.recipe_templates rt ON r.template_id = rt.id
    WHERE pc.category_id IS NULL
  LOOP
    template_category := product_record.template_category;
    
    -- Map template categories to POS categories
    target_category_name := CASE 
      WHEN LOWER(template_category) IN ('classic') THEN 'Classic'
      WHEN LOWER(template_category) IN ('addon', 'add-ons') THEN 'Add-ons'
      WHEN LOWER(template_category) IN ('beverages', 'others') THEN 'Beverages'
      WHEN LOWER(template_category) IN ('espresso') THEN 'Espresso'
      WHEN LOWER(template_category) IN ('croffle_overload') THEN 'Croffle Overload'
      WHEN LOWER(template_category) IN ('mini_croffle') THEN 'Mini Croffle'
      WHEN LOWER(template_category) IN ('combo') THEN 'Combo'
      ELSE 'Classic' -- Default fallback
    END;
    
    -- Get the category ID for this store
    SELECT id INTO target_category_id
    FROM public.categories
    WHERE store_id = product_record.store_id
    AND name = target_category_name
    AND is_active = true
    LIMIT 1;
    
    -- Update the product catalog entry
    IF target_category_id IS NOT NULL THEN
      UPDATE public.product_catalog
      SET category_id = target_category_id
      WHERE id = product_record.product_id;
      
      RAISE NOTICE 'Updated product % with category % (ID: %)', 
        product_record.product_name, target_category_name, target_category_id;
    END IF;
  END LOOP;
END $$;