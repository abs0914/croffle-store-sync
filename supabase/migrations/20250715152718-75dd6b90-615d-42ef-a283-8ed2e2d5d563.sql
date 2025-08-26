-- Update recipes to link them to their product catalog entries
UPDATE recipes 
SET product_id = pc.id,
    updated_at = NOW()
FROM product_catalog pc
WHERE recipes.id = pc.recipe_id 
  AND recipes.name = 'Mini Take Out Box'
  AND recipes.product_id IS NULL;

-- Broadcast cache invalidation signal for POS refresh
INSERT INTO public.cache_invalidation_events (
  event_type, 
  table_name, 
  store_id, 
  event_data, 
  created_at
)
SELECT 
  'product_catalog_updated',
  'product_catalog',
  store_id,
  json_build_object(
    'product_name', 'Mini Take Out Box',
    'action', 'deployed',
    'timestamp', NOW()
  ),
  NOW()
FROM stores 
WHERE is_active = true;