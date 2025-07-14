-- Create "Glaze" category for all active stores
INSERT INTO public.categories (name, description, store_id, is_active)
SELECT 
  'Glaze',
  'Glaze products and specialty items',
  s.id,
  true
FROM public.stores s
WHERE s.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM public.categories c 
  WHERE c.store_id = s.id 
  AND c.name = 'Glaze'
);

-- Create product catalog entries for Glaze Croffle in all stores
INSERT INTO public.product_catalog (
  product_name,
  description,
  price,
  store_id,
  recipe_id,
  category_id,
  is_available,
  display_order
)
SELECT 
  rt.name,
  rt.description,
  COALESCE(r.suggested_price, rt.base_price, 150.00),
  s.id,
  r.id,
  c.id,
  true,
  1
FROM public.stores s
CROSS JOIN public.recipe_templates rt
JOIN public.recipes r ON r.template_id = rt.id AND r.store_id = s.id
JOIN public.categories c ON c.store_id = s.id AND c.name = 'Glaze'
WHERE s.is_active = true
  AND rt.name = 'Glaze Croffle'
  AND rt.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.product_catalog pc 
    WHERE pc.store_id = s.id 
    AND pc.recipe_id = r.id
  );