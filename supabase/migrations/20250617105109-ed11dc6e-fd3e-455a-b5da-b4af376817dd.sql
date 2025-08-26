
-- First, let's identify and remove duplicate recipes (keeping the most recent one)
WITH ranked_recipes AS (
  SELECT id, store_id, name, 
         ROW_NUMBER() OVER (PARTITION BY store_id, name ORDER BY created_at DESC) as rn
  FROM public.recipes
),
duplicates_to_delete AS (
  SELECT id FROM ranked_recipes WHERE rn > 1
)
DELETE FROM public.recipes 
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- Now add the unique constraint
ALTER TABLE public.recipes ADD CONSTRAINT unique_recipe_per_store UNIQUE (store_id, name);
