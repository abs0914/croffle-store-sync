-- Final verification audit for Sugbo Mercado after repair
SELECT 
  'Sugbo Mercado Audit Results' as audit_summary,
  COUNT(DISTINCT pc.id) as total_products,
  COUNT(DISTINCT CASE WHEN r.id IS NOT NULL THEN pc.id END) as products_with_recipes,
  COUNT(DISTINCT CASE WHEN r.id IS NULL THEN pc.id END) as products_missing_recipes,
  COUNT(DISTINCT r.id) as total_recipes,
  COUNT(DISTINCT CASE WHEN r.template_id IS NOT NULL THEN r.id END) as recipes_with_templates,
  COUNT(DISTINCT CASE WHEN r.template_id IS NULL THEN r.id END) as recipes_without_templates
FROM product_catalog pc
LEFT JOIN recipes r ON pc.recipe_id = r.id AND r.is_active = true
WHERE pc.store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
  AND pc.is_available = true;