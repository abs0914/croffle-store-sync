-- SECURITY FIXES MIGRATION (final)
-- 1) Replace vulnerable admin check and harden SECURITY DEFINER functions

-- 1.a Ensure app_users policy uses secure helper (idempotent)
DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'app_users' AND policyname = 'admins_owners_can_write'
  ) THEN
    EXECUTE 'ALTER POLICY "admins_owners_can_write" ON public.app_users USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner())';
  END IF;
END
$body$;

-- 1.b Replace vulnerable function with secure implementation (no email bypass)
CREATE OR REPLACE FUNCTION public.is_admin_or_owner_user()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role::text INTO user_role 
  FROM public.app_users 
  WHERE user_id = auth.uid()
  AND is_active = true
  LIMIT 1;
  
  RETURN user_role IN ('admin', 'owner');
END;
$$;

-- 1.c Harden SECURITY DEFINER functions by setting explicit search_path
CREATE OR REPLACE FUNCTION public.handle_recipe_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Placeholder logic; can be extended for inventory deductions
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_commissary_purchase_history(item_id uuid, limit_count integer DEFAULT 10)
RETURNS TABLE(purchase_date date, quantity_purchased numeric, unit_cost numeric, total_cost numeric, supplier_name text, batch_number text, notes text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.purchase_date,
    cp.quantity_purchased,
    cp.unit_cost,
    cp.total_cost,
    s.name as supplier_name,
    cp.batch_number,
    cp.notes
  FROM public.commissary_purchases cp
  LEFT JOIN public.suppliers s ON cp.supplier_id = s.id
  WHERE cp.commissary_item_id = item_id
  ORDER BY cp.purchase_date DESC, cp.created_at DESC
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_store_access(user_id uuid, store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
  user_stores UUID[];
BEGIN
  -- Get user role and assigned stores
  SELECT role, store_ids INTO user_role, user_stores
  FROM public.app_users
  WHERE app_users.user_id = user_has_store_access.user_id;
  
  -- Admins and owners have access to all stores
  IF user_role IN ('admin', 'owner') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has access to specified store
  RETURN store_id = ANY(user_stores);
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_commissary_to_store(p_commissary_item_id uuid, p_store_id uuid, p_quantity numeric, p_unit_cost numeric, p_fulfilled_by uuid, p_notes text DEFAULT 'Commissary transfer')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commissary_stock NUMERIC;
  v_item_name TEXT;
  v_item_unit TEXT;
  v_inventory_stock_id UUID;
BEGIN
  -- Get commissary item details and check stock
  SELECT current_stock, name, unit 
  INTO v_commissary_stock, v_item_name, v_item_unit
  FROM public.commissary_inventory 
  WHERE id = p_commissary_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commissary item not found';
  END IF;
  
  IF v_commissary_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient commissary stock';
  END IF;
  
  -- Update commissary inventory
  UPDATE public.commissary_inventory 
  SET current_stock = current_stock - p_quantity,
      updated_at = NOW()
  WHERE id = p_commissary_item_id;
  
  -- Find or create inventory stock item in store
  SELECT id INTO v_inventory_stock_id
  FROM public.inventory_stock 
  WHERE store_id = p_store_id 
    AND item = v_item_name 
    AND unit = v_item_unit;
    
  IF v_inventory_stock_id IS NULL THEN
    -- Create new inventory stock item
    INSERT INTO public.inventory_stock (store_id, item, unit, stock_quantity, cost, is_active)
    VALUES (p_store_id, v_item_name, v_item_unit, p_quantity, p_unit_cost, true)
    RETURNING id INTO v_inventory_stock_id;
  ELSE
    -- Update existing inventory stock
    UPDATE public.inventory_stock 
    SET stock_quantity = stock_quantity + p_quantity,
        cost = p_unit_cost,
        updated_at = NOW()
    WHERE id = v_inventory_stock_id;
  END IF;
  
  -- Log inventory transaction
  INSERT INTO public.inventory_transactions (
    store_id, product_id, transaction_type, quantity, 
    previous_quantity, new_quantity, created_by, notes
  )
  SELECT 
    p_store_id, 
    v_inventory_stock_id, 
    'commissary_transfer', 
    p_quantity, 
    COALESCE(stock_quantity - p_quantity, 0), 
    stock_quantity, 
    p_fulfilled_by, 
    p_notes
  FROM public.inventory_stock 
  WHERE id = v_inventory_stock_id;
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  RAISE;
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_template_images_to_products()
RETURNS TABLE(updated_count integer, error_count integer, details text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_record RECORD;
  updated_count integer := 0;
  error_count integer := 0;
  details text[] := ARRAY[]::text[];
BEGIN
  FOR product_record IN 
    SELECT 
      pc.id,
      pc.product_name,
      pc.store_id,
      rt.image_url as template_image_url,
      s.name as store_name
    FROM public.product_catalog pc
    JOIN public.recipes r ON pc.recipe_id = r.id
    JOIN public.recipe_templates rt ON r.template_id = rt.id
    JOIN public.stores s ON pc.store_id = s.id
    WHERE pc.image_url IS NULL 
      AND rt.image_url IS NOT NULL
  LOOP
    BEGIN
      UPDATE public.product_catalog 
      SET 
        image_url = product_record.template_image_url,
        updated_at = NOW()
      WHERE id = product_record.id;

      updated_count := updated_count + 1;
      details := details || (
        'Updated ' || product_record.product_name || 
        ' in ' || product_record.store_name || 
        ' with template image'
      );

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      details := details || (
        'Error updating ' || product_record.product_name || 
        ' in ' || product_record.store_name || ': ' || SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT updated_count, error_count, details;
END;
$$;

CREATE OR REPLACE FUNCTION public.migrate_product_catalog_to_products()
RETURNS TABLE(migrated_count integer, skipped_count integer, error_count integer, details text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  catalog_record RECORD;
  migrated_count integer := 0;
  skipped_count integer := 0;
  error_count integer := 0;
  details text[] := ARRAY[]::text[];
  generated_sku text;
  calculated_cost numeric;
BEGIN
  FOR catalog_record IN 
    SELECT pc.*, r.total_cost as recipe_cost
    FROM public.product_catalog pc
    LEFT JOIN public.recipes r ON pc.recipe_id = r.id
  LOOP
    BEGIN
      IF EXISTS (
        SELECT 1 FROM public.products 
        WHERE store_id = catalog_record.store_id 
        AND name = catalog_record.product_name
      ) THEN
        skipped_count := skipped_count + 1;
        details := details || (catalog_record.product_name || ' already exists in products table');
        CONTINUE;
      END IF;

      generated_sku := public.generate_recipe_sku(catalog_record.product_name, 'recipe');
      calculated_cost := COALESCE(catalog_record.recipe_cost, catalog_record.price * 0.6);

      INSERT INTO public.products (
        name,
        description,
        price,
        cost,
        sku,
        stock_quantity,
        category_id,
        store_id,
        is_active,
        recipe_id,
        product_type,
        image_url
      ) VALUES (
        catalog_record.product_name,
        catalog_record.description,
        catalog_record.price,
        calculated_cost,
        generated_sku,
        100,
        catalog_record.category_id,
        catalog_record.store_id,
        catalog_record.is_available,
        catalog_record.recipe_id,
        'recipe',
        catalog_record.image_url
      );

      migrated_count := migrated_count + 1;
      details := details || ('Successfully migrated: ' || catalog_record.product_name);

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      details := details || ('Error migrating ' || catalog_record.product_name || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT migrated_count, skipped_count, error_count, details;
END;
$$;

-- 2) Tighten overly permissive RLS policies

-- 2.a Categories: remove broad allow-all policy
DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Enable all operations for authenticated users'
  ) THEN
    EXECUTE 'DROP POLICY "Enable all operations for authenticated users" ON public.categories;';
  END IF;
END
$body$;

-- 2.b Customers: remove public policies exposing PII
DO $body$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Allow public to create customers'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public to create customers" ON public.customers;';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'customers' AND policyname = 'Allow public to view their own customer data'
  ) THEN
    EXECUTE 'DROP POLICY "Allow public to view their own customer data" ON public.customers;';
  END IF;
END
$body$;

-- 2.c Cashiers: replace allow-all policies with store-scoped, role-aware policies
DO $body$
BEGIN
  -- Drop permissive policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cashiers' AND policyname='Enable delete access for all users'
  ) THEN EXECUTE 'DROP POLICY "Enable delete access for all users" ON public.cashiers;'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cashiers' AND policyname='Enable insert access for all users'
  ) THEN EXECUTE 'DROP POLICY "Enable insert access for all users" ON public.cashiers;'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cashiers' AND policyname='Enable read access for all users'
  ) THEN EXECUTE 'DROP POLICY "Enable read access for all users" ON public.cashiers;'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cashiers' AND policyname='Enable update access for all users'
  ) THEN EXECUTE 'DROP POLICY "Enable update access for all users" ON public.cashiers;'; END IF;
  
  -- Create SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cashiers' AND policyname='Users can view cashiers for their stores'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view cashiers for their stores" ON public.cashiers FOR SELECT USING (public.user_has_store_access(auth.uid(), store_id));';
  END IF;
  
  -- Create INSERT policy (managers+ only for their stores; admins/owners any)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cashiers' AND policyname='Managers and above can create cashiers'
  ) THEN
    EXECUTE 'CREATE POLICY "Managers and above can create cashiers" ON public.cashiers FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.app_users au WHERE au.user_id = auth.uid() AND au.is_active = true AND (au.role IN (''admin'',''owner'') OR (au.role = ''manager'' AND cashiers.store_id = ANY (au.store_ids)))));';
  END IF;
  
  -- Create UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cashiers' AND policyname='Managers and above can update cashiers'
  ) THEN
    EXECUTE 'CREATE POLICY "Managers and above can update cashiers" ON public.cashiers FOR UPDATE USING (EXISTS (SELECT 1 FROM public.app_users au WHERE au.user_id = auth.uid() AND au.is_active = true AND (au.role IN (''admin'',''owner'') OR (au.role = ''manager'' AND cashiers.store_id = ANY (au.store_ids))))) WITH CHECK (EXISTS (SELECT 1 FROM public.app_users au WHERE au.user_id = auth.uid() AND au.is_active = true AND (au.role IN (''admin'',''owner'') OR (au.role = ''manager'' AND cashiers.store_id = ANY (au.store_ids)))));';
  END IF;
  
  -- Create DELETE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cashiers' AND policyname='Managers and above can delete cashiers'
  ) THEN
    EXECUTE 'CREATE POLICY "Managers and above can delete cashiers" ON public.cashiers FOR DELETE USING (EXISTS (SELECT 1 FROM public.app_users au WHERE au.user_id = auth.uid() AND au.is_active = true AND (au.role IN (''admin'',''owner'') OR (au.role = ''manager'' AND cashiers.store_id = ANY (au.store_ids)))));';
  END IF;
END
$body$;