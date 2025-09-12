-- Enable RLS on recipe_ingredients (safe if already enabled)
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Policy: Managers and above can UPDATE recipe ingredients (scoped by parent recipe's store)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'recipe_ingredients' 
      AND policyname = 'Managers and above can update recipe ingredients'
  ) THEN
    CREATE POLICY "Managers and above can update recipe ingredients"
    ON public.recipe_ingredients
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM app_users au
        JOIN recipes r ON r.id = recipe_ingredients.recipe_id
        WHERE au.user_id = auth.uid()
          AND au.is_active = true
          AND (
            au.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])
            OR (au.role = 'manager'::app_role AND r.store_id = ANY (au.store_ids))
          )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM app_users au
        JOIN recipes r ON r.id = recipe_ingredients.recipe_id
        WHERE au.user_id = auth.uid()
          AND au.is_active = true
          AND (
            au.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])
            OR (au.role = 'manager'::app_role AND r.store_id = ANY (au.store_ids))
          )
      )
    );
  END IF;
END $$;

-- Policy: Managers and above can DELETE recipe ingredients (scoped by parent recipe's store)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'recipe_ingredients' 
      AND policyname = 'Managers and above can delete recipe ingredients'
  ) THEN
    CREATE POLICY "Managers and above can delete recipe ingredients"
    ON public.recipe_ingredients
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM app_users au
        JOIN recipes r ON r.id = recipe_ingredients.recipe_id
        WHERE au.user_id = auth.uid()
          AND au.is_active = true
          AND (
            au.role = ANY (ARRAY['admin'::app_role, 'owner'::app_role])
            OR (au.role = 'manager'::app_role AND r.store_id = ANY (au.store_ids))
          )
      )
    );
  END IF;
END $$;